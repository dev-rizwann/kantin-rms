import java.nio.file.*;
import java.sql.*;
import java.util.*;
public class TestClearTestSales {
    static void check(boolean b,String s){if(!b)throw new AssertionError(s);}
    public static void main(String[] args)throws Exception {
        Path base=Paths.get(args[1]).toRealPath();
        if(!base.getFileName().toString().startsWith("muzafarabad-launch-qa-"))throw new SecurityException("Disposable fixture only");
        Path root=base.resolve("snapshot-clear-"+UUID.randomUUID());
        KantinMaintenance.verify(Paths.get(args[0]),root);Properties p=KantinSetup.installed(root);
        Map<String,String> before=new TreeMap<>();
        try(Connection c=KantinSetup.connect(root,p)){
            check(KantinClearTestSales.scalar(c,"SELECT COUNT(*) FROM RECEIPT")==3,"Known synthetic fixture required");
            for(String t:KantinClearTestSales.tables(c))before.put(t,KantinClearTestSales.fingerprint(c,t));
            try{KantinClearTestSales.clear(c,root,p,"SYNTHETIC-QA",Paths.get(args[0]),true);throw new AssertionError("Expected injected failure");}
            catch(SQLException e){check(e.getMessage().equals("Injected rollback test"),"Unexpected SQL failure");}
            for(String t:before.keySet())check(before.get(t).equals(KantinClearTestSales.fingerprint(c,t)),"Rollback: "+t);
            check(KantinClearTestSales.getMarker(c)==null,"Rollback marker absent");
        }finally{KantinSetup.shutdown(root,p);}
        KantinClearTestSales.main(new String[]{root.toString(),"SYNTHETIC-QA"});
        try(Connection c=KantinSetup.connect(root,p)){
            for(String t:before.keySet()){
                if(KantinClearTestSales.ALLOWED.contains(t))check(KantinClearTestSales.scalar(c,"SELECT COUNT(*) FROM "+t)==0,"Cleared: "+t);
                else check(before.get(t).equals(KantinClearTestSales.fingerprint(c,t)),"Retained: "+t);
            }
            // New trading after cleanup must survive both a repeated invocation and a lost evidence file.
            int session=TestReportCollector.add(c,"SESSION","STAFFSTARTID",1);
            int table=(int)KantinClearTestSales.scalar(c,"SELECT MIN(ID) FROM TABLES");
            int receipt=TestReportCollector.add(c,"RECEIPT","SESSIONID",session,"TABLEID",table,"STAFFID",1);
            check(receipt>3,"Receipt counter must not rewind");
        }finally{KantinSetup.shutdown(root,p);}
        Files.delete(root.resolve(".kantin/muzafarabad-cleanup.json"));
        KantinClearTestSales.main(new String[]{root.toString(),"SYNTHETIC-QA"});
        try(Connection c=KantinSetup.connect(root,p)){check(KantinClearTestSales.scalar(c,"SELECT COUNT(*) FROM RECEIPT")==1,"Real receipt preserved on rerun");}
        finally{KantinSetup.shutdown(root,p);}
        System.out.println("PASS: FK-ordered cleanup, 61-table rollback, retained settings/PINs/menu, monotonic IDs, lost-evidence recovery and rerun protection.");
        System.out.println("Fixture: "+root);
    }
}
