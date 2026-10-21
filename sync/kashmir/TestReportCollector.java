import java.nio.file.*;
import java.sql.*;
import java.util.*;

/** Synthetic data only, newly extracted disposable fixture, never shipped. */
public class TestReportCollector {
    static int add(Connection c, String table, Object... overrides) throws Exception {
        Map<String,Object> values = new HashMap<>();
        for(int i=0;i<overrides.length;i+=2) values.put((String)overrides[i],overrides[i+1]);
        List<String> columns = new ArrayList<>(); List<Object> args = new ArrayList<>();
        try(ResultSet rs=c.getMetaData().getColumns(null,"KANTIN",table,"%")) {
            while(rs.next()) {
                String name=rs.getString("COLUMN_NAME");
                if(name.equals("ID"))continue;
                if(!values.containsKey(name)&&rs.getInt("NULLABLE")!=0)continue;
                Object value=values.get(name);
                if(!values.containsKey(name)) {
                    int t=rs.getInt("DATA_TYPE");
                    if(t==Types.VARCHAR)value="";
                    else if(t==Types.BOOLEAN)value=false;
                    else if(t==Types.TIMESTAMP)value=Timestamp.valueOf("2026-10-22 09:00:00");
                    else value=0;
                }
                columns.add(name);args.add(value);
            }
        }
        String sql="INSERT INTO KANTIN."+table+"("+String.join(",",columns)+") VALUES("+String.join(",",Collections.nCopies(args.size(),"?"))+")";
        try(PreparedStatement st=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS)) {
            for(int i=0;i<args.size();i++)st.setObject(i+1,args.get(i));
            st.executeUpdate();try(ResultSet r=st.getGeneratedKeys()){r.next();return r.getInt(1);}
        }
    }
    public static void main(String[] args)throws Exception {
        Path base=Paths.get(args[1]).toRealPath(), root=base.resolve("snapshot-synthetic-fixture-"+UUID.randomUUID());
        if(!base.getFileName().toString().startsWith("kashmir-sync-")||Files.exists(root))throw new SecurityException("Fresh reporting QA fixture only");
        KantinMaintenance.verify(Paths.get(args[0]),root);
        Properties p=KantinSetup.installed(root);
        try(Connection c=KantinSetup.connect(root,p)) {
            try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SELECT COUNT(*) FROM KANTIN.RECEIPT")){r.next();if(r.getInt(1)!=0)throw new SecurityException("Empty fixture required");}
            int category=add(c,"CATEGORY","TITLE","Food"), qa=add(c,"CATEGORY","TITLE","QA TEST");
            int item=add(c,"ITEM","CATEGORYID",category,"TITLE","Fries","PRICE",100f);
            int test=add(c,"ITEM","CATEGORYID",qa,"TITLE","Sample","PRICE",200f);
            int session=add(c,"SESSION","STAFFSTARTID",1);
            int table=add(c,"TABLES","TITLE","Takeaway");
            int pt=add(c,"PAYMENTTYPE","TITLE","-1");
            for(int i=0;i<3;i++) {
                int receipt=add(c,"RECEIPT","SESSIONID",session,"TABLEID",table,"STAFFID",1,
                    "OPENTIME",Timestamp.valueOf(i==0?"2026-10-21 09:00:00":"2026-10-22 09:00:00"));
                int sale=add(c,"ITEMSALE","RECEIPTID",receipt,"ITEMID",i==1?test:item,"STAFFID",1,"PRICE",100f);
                int checkout=add(c,"CHECKOUT","RECEIPTID",receipt,"STAFFID",1,"TOTAL",100f);
                add(c,"PAYMENT","CHECKOUTID",checkout,"STAFFID",1,"TYPEID",pt,"PAID",100f,"PAYMENTTIME",Timestamp.valueOf("2026-10-22 09:00:00"));
                if(i==2){add(c,"REFUND","RECEIPTID",receipt,"STAFFID",1,"ITEMSALEID",sale);add(c,"CANCEL","ITEMSALEID",sale,"STAFFID",1);}
            }
            add(c,"PAYMENT","STAFFID",1,"TYPEID",pt,"PAID",100f);
        }
        Path backup=KantinMaintenance.backup(root);
        KantinSetup.shutdown(root,p);
        KantinReportExport.main(new String[]{"snapshot",backup.toString(),base.resolve("snapshot-synthetic-export").toString(),base.resolve("synthetic-tables.json").toString()});
        System.out.println("Synthetic receipt, QA, payment, prepayment and refund fixture exported.");
    }
}
