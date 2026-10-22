import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;

/** Reads only a newly extracted engine-consistent backup; never the live DB. */
public final class KantinReportExport {
    static final String[][] TABLES = {
        {"RECEIPT","id sessionid tableid staffid opentime customerid source"},
        {"CHECKOUT","id receiptid staffid total rounding void created"},
        {"ITEMSALE","id receiptid itemid staffid price saletime mode orderstatus plate"},
        {"PAYMENT","id checkoutid staffid paid balance paymenttime typeid"},
        {"CANCEL","id itemsaleid staffid reason canceltime"},
        {"REFUND","id receiptid staffid refundon itemsaleid reason"},
        {"SESSION","id staffstartid staffcloseid starttime closetime pettycash"},
        {"ITEM","id categoryid title price pricetakeaway pricedelivery tax status onsale itemtype barcode description"},
        {"CATEGORY","id title status"},{"STAFF","id fname sname workpos status"},
        {"CUSTOMER","id title status"},{"PAYMENTTYPE","id title status"}
    };
    static String json(String s) {
        if(s==null)return "null";StringBuilder b=new StringBuilder("\"");
        for(char c:s.toCharArray())switch(c){case '"':b.append("\\\"");break;case '\\':b.append("\\\\");break;case '\n':b.append("\\n");break;case '\r':b.append("\\r");break;case '\t':b.append("\\t");break;default:if(c<32)b.append(String.format("\\u%04x",(int)c));else b.append(c);}
        return b.append('"').toString();
    }
    static String value(Object o) {
        if(o==null)return "null";
        if(o instanceof Number){String s=o.toString();if(s.equals("NaN")||s.contains("Infinity"))throw new IllegalArgumentException("Non-finite number");return s;}
        if(o instanceof Boolean)return o.toString();
        if(o instanceof Timestamp){String s=((Timestamp)o).toLocalDateTime().toString();if(s.length()==16)s+=":00";return json(s);}
        return json(o.toString());
    }
    static void write(Path output,String s)throws Exception {Files.write(output,s.getBytes(StandardCharsets.UTF_8),StandardOpenOption.CREATE_NEW);}
    public static void main(String[] args)throws Exception {
        if(args.length!=4||!(args[0].equals("metadata")||args[0].equals("snapshot")))throw new IllegalArgumentException("metadata|snapshot BACKUP.zip NEW_STAGE OUTPUT.json");
        Path archive=Paths.get(args[1]).toRealPath(),stage=Paths.get(args[2]).toAbsolutePath().normalize(),output=Paths.get(args[3]).toAbsolutePath().normalize();
        if(Files.exists(stage)||Files.exists(output)||!stage.getFileName().toString().startsWith("snapshot-"))throw new SecurityException("A fresh snapshot staging directory is required");
        KantinMaintenance.verify(archive,stage);
        Properties p=KantinSetup.installed(stage);
        if(!"Kantin POS".equals(p.getProperty("product"))||!"KANTIN".equals(p.getProperty("dbUser")))throw new SecurityException("Not a new Kantin POS backup");
        UUID.fromString(p.getProperty("instanceId"));
        try(Connection c=KantinSetup.connect(stage,p)) {
            c.setReadOnly(true);
            if(args[0].equals("metadata")) {
                try(Statement st=c.createStatement();ResultSet r=st.executeQuery("SELECT COALESCE(MAX(ID),0) FROM KANTIN.RECEIPT")) {
                    r.next();long baseline=r.getLong(1);String cleanup="null";
                    try(Statement cs=c.createStatement();ResultSet cr=cs.executeQuery("SELECT VALUE FROM KANTIN.PROPERTIES WHERE DEVICEID IS NULL AND TITLE='kantin.muzafarabad.cleanup.v1'")){
                        if(cr.next()){
                            String[] m=cr.getString(1).split("\\|",-1);
                            if(m.length!=7||!m[0].equals("1"))throw new SecurityException("Invalid cleanup evidence");
                            UUID.fromString(m[1]);java.time.Instant.parse(m[2]);long old=Long.parseLong(m[3]);
                            cleanup="{\"cleanupId\":"+json(m[1])+",\"cleanupUtc\":"+json(m[2])+",\"receiptBaseline\":"+old+",\"computerName\":"+json(m[6])+"}";
                            if(cr.next())throw new SecurityException("Duplicate cleanup evidence");
                        }
                    }
                    write(output,"{\"instanceId\":"+json(p.getProperty("instanceId"))+",\"receiptBaseline\":"+baseline+",\"cleanup\":"+cleanup+"}");
                }
            } else {
                StringBuilder out=new StringBuilder("{");boolean firstTable=true;
                for(String[] spec:TABLES) {
                    if(!firstTable)out.append(',');firstTable=false;out.append(json(spec[0])).append(":[");
                    String[] cols=spec[1].split(" ");boolean firstRow=true;
                    try(Statement st=c.createStatement();ResultSet r=st.executeQuery("SELECT "+String.join(",",cols)+" FROM KANTIN."+spec[0]+" ORDER BY ID")) {
                        while(r.next()){if(!firstRow)out.append(',');firstRow=false;out.append('{');for(int i=0;i<cols.length;i++){if(i>0)out.append(',');out.append(json(cols[i])).append(':').append(value(r.getObject(i+1)));}out.append('}');
                            if(out.length()>30*1024*1024)throw new IOException("Snapshot size limit reached; no upload performed");}
                    }
                    out.append(']');
                }
                write(output,out.append('}').toString());
            }
        } finally {KantinSetup.shutdown(stage,p);}
        System.out.println("Verified backup read completed ("+args[0]+"). No live database opened.");
    }
}
