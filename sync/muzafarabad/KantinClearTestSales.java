import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.*;
import java.security.MessageDigest;
import java.util.*;

/** One-time, authenticated cleanup of the new Kantin installation, not a reset. */
public final class KantinClearTestSales {
    static final String MARKER="kantin.muzafarabad.cleanup.v1";
    static final Set<String> ROOTS=new TreeSet<>(Arrays.asList("SESSION","RECEIPT","CHECKOUT","ITEMSALE","PAYMENT","CANCEL","REFUND","PAYOUT"));
    static final Set<String> ALLOWED=new TreeSet<>(Arrays.asList(
        "SESSION","RECEIPT","CHECKOUT","ITEMSALE","PAYMENT","CANCEL","REFUND","PAYOUT",
        "CHARGELINK","DISPATCH","BLINKRECEIPT","GETIRRECEIPT","MIGROSRECEIPT","ONLINECOURIER",
        "POSPAYMENT","TRENDYOLRECEIPT","WOORECEIPT","YSEPETIRECEIPT","PROMOSALE","REDEEM","SALEREMLINK","TAXREFERENCE","DEMAND"));
    static String getMarker(Connection c)throws Exception {
        try(PreparedStatement s=c.prepareStatement("SELECT VALUE FROM KANTIN.PROPERTIES WHERE DEVICEID IS NULL AND TITLE=?")){
            s.setString(1,MARKER);try(ResultSet r=s.executeQuery()){
                if(!r.next())return null;String v=r.getString(1);
                if(r.next())throw new SecurityException("Duplicate cleanup marker");return v;
            }
        }
    }
    static long scalar(Connection c,String sql)throws Exception {try(Statement s=c.createStatement();ResultSet r=s.executeQuery(sql)){r.next();return r.getLong(1);}}
    static String digest(byte[] b)throws Exception {
        StringBuilder s=new StringBuilder();for(byte x:MessageDigest.getInstance("SHA-256").digest(b))s.append(String.format("%02x",x&255));return s.toString();
    }
    static String fingerprint(Connection c,String table)throws Exception {
        List<String> rows=new ArrayList<>();
        try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SELECT * FROM KANTIN."+table+
            (table.equals("PROPERTIES")?" WHERE TITLE <> '"+MARKER+"'":""))){
            int n=r.getMetaData().getColumnCount();
            while(r.next()){
                StringBuilder b=new StringBuilder();
                for(int i=1;i<=n;i++){String v=r.getString(i);b.append(v==null?"N;":v.length()+":"+v+";");}
                rows.add(digest(b.toString().getBytes(StandardCharsets.UTF_8)));
            }
        }
        Collections.sort(rows);return digest(String.join("\n",rows).getBytes(StandardCharsets.UTF_8));
    }
    static Set<String> tables(Connection c)throws Exception {
        Set<String> result=new TreeSet<>();try(ResultSet r=c.getMetaData().getTables(null,"KANTIN","%",new String[]{"TABLE"})){
            while(r.next()){String t=r.getString("TABLE_NAME");if(!t.matches("[A-Z][A-Z0-9]*"))throw new SecurityException("Unknown table name");result.add(t);}
        }
        if(result.size()!=61||!result.containsAll(ALLOWED))throw new SecurityException("Unexpected schema; nothing cleared");return result;
    }
    static List<String> deletionOrder(Connection c,Set<String> tables)throws Exception {
        Map<String,Set<String>> children=new TreeMap<>();for(String t:tables)children.put(t,new TreeSet<>());
        for(String t:tables)try(ResultSet r=c.getMetaData().getImportedKeys(null,"KANTIN",t)){
            while(r.next()){
                String parent=r.getString("PKTABLE_NAME");
                if(!"KANTIN".equals(r.getString("PKTABLE_SCHEM"))||!children.containsKey(parent))throw new SecurityException("Unknown foreign key");
                children.get(parent).add(t);
            }
        }
        Set<String> selected=new TreeSet<>(ROOTS);boolean changed;
        do{int n=selected.size();for(String t:new ArrayList<>(selected))selected.addAll(children.get(t));changed=selected.size()!=n;}while(changed);
        if(!ALLOWED.containsAll(selected))throw new SecurityException("Unexpected dependency; nothing cleared: "+selected);
        // Explicitly include empty/unlinked transaction tables as well.
        selected.addAll(ALLOWED);
        List<String> order=new ArrayList<>();Set<String> pending=new TreeSet<>(selected);
        while(!pending.isEmpty()){
            int n=pending.size();for(String t:new ArrayList<>(pending)){
                Set<String> remaining=new HashSet<>(children.get(t));remaining.retainAll(pending);
                if(remaining.isEmpty()){order.add(t);pending.remove(t);}
            }
            if(pending.size()==n)throw new SecurityException("Cyclic transaction dependencies; nothing cleared");
        }
        return order;
    }
    static String evidence(Properties identity,String marker,Path backup)throws Exception {
        String[] p=marker.split("\\|",-1);
        if(p.length!=7||!p[0].equals("1"))throw new SecurityException("Invalid cleanup marker");
        UUID.fromString(p[1]);Instant.parse(p[2]);Long.parseLong(p[3]);
        return "{\"version\":1,\"kantinSlug\":\"kashmir\",\"instanceId\":"+KantinReportExport.json(identity.getProperty("instanceId"))+
            ",\"cleanupId\":"+KantinReportExport.json(p[1])+",\"cleanupUtc\":"+KantinReportExport.json(p[2])+
            ",\"receiptBaseline\":"+p[3]+",\"preCleanupBackup\":"+KantinReportExport.json(p[4])+
            ",\"preCleanupSha256\":"+KantinReportExport.json(p[5])+",\"computerName\":"+KantinReportExport.json(p[6])+
            ",\"postCleanupBackup\":"+KantinReportExport.json(backup==null?null:backup.getFileName().toString())+"}";
    }
    static void clear(Connection c,Path root,Properties identity,String computer,Path before,boolean failForTest)throws Exception {
        c.setAutoCommit(false);
        try {
            c.setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);
            if(getMarker(c)!=null)throw new SecurityException("Cleanup already committed; deletion refused");
            Set<String> all=tables(c);List<String> order=deletionOrder(c,all);
            Map<String,String> retained=new TreeMap<>();for(String t:all)if(!ALLOWED.contains(t))retained.put(t,fingerprint(c,t));
            long baseline=scalar(c,"SELECT COALESCE(MAX(ID),0) FROM KANTIN.RECEIPT");
            for(String t:order){int n;try(Statement s=c.createStatement()){n=s.executeUpdate("DELETE FROM KANTIN."+t);}System.out.println("Cleared "+t+": "+n);}
            if(failForTest)throw new SQLException("Injected rollback test");
            for(String t:order)if(scalar(c,"SELECT COUNT(*) FROM KANTIN."+t)!=0)throw new AssertionError("Cleanup incomplete: "+t);
            String marker="1|"+UUID.randomUUID()+"|"+Instant.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS)+"|"+baseline+"|"+before.getFileName()+"|"+KantinMaintenance.hash(before)+"|"+computer;
            try(PreparedStatement s=c.prepareStatement("INSERT INTO KANTIN.PROPERTIES(DEVICEID,TITLE,VALUE) VALUES(NULL,?,?)")){s.setString(1,MARKER);s.setString(2,marker);s.executeUpdate();}
            for(String t:retained.keySet())if(!retained.get(t).equals(fingerprint(c,t)))throw new AssertionError("Preserved table changed: "+t);
            c.commit();System.out.println("Cleanup committed. "+retained.size()+" configuration/catalogue tables verified unchanged; ID counters retained.");
        } catch(Exception|Error e){c.rollback();throw e;} finally {c.setAutoCommit(true);}
    }
    public static void main(String[] args)throws Exception {
        if(args.length!=2)throw new IllegalArgumentException("INSTALLATION COMPUTER_NAME");
        Path root=Paths.get(args[0]).toRealPath();String computer=args[1];
        if(!computer.matches("[A-Za-z0-9-]{1,63}"))throw new SecurityException("Invalid computer name");
        Properties p=KantinSetup.installed(root);
        if(!"Kantin POS".equals(p.getProperty("product"))||!"KANTIN".equals(p.getProperty("dbUser")))throw new SecurityException("New Kantin installation required; legacy POS prohibited");
        UUID.fromString(p.getProperty("instanceId"));
        try {
            String marker;
            try(Connection c=KantinSetup.connect(root,p)){marker=getMarker(c);tables(c);}
            if(marker==null){
                Path before=KantinMaintenance.backup(root);KantinMaintenance.verify(before,null);
                System.out.println("Verified pre-cleanup backup: "+before.getFileName());
                try(Connection c=KantinSetup.connect(root,p)){clear(c,root,p,computer,before,false);}
            } else System.out.println("Already cleared previously. No records deleted again.");
            try(Connection c=KantinSetup.connect(root,p)){marker=getMarker(c);}
            Path after=KantinMaintenance.backup(root);KantinMaintenance.verify(after,null);
            KantinMaintenance.atomic(root.resolve(".kantin/muzafarabad-cleanup.json"),evidence(p,marker,after));
            System.out.println("Cleanup evidence and verified post-cleanup backup saved.");
        } finally {KantinSetup.shutdown(root,p);}
    }
}
