import java.sql.Connection;
import java.sql.DriverManager;

public class TestMySQLConnection {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/userdb?sslMode=DISABLED&serverTimezone=UTC&characterEncoding=UTF-8&useUnicode=true&allowPublicKeyRetrieval=true";
        String user = "root";
        String password = "root123";

        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            Connection conn = DriverManager.getConnection(url, user, password);
            System.out.println("✅ MySQL 연결 성공!");
            System.out.println("Connection: " + conn);
            conn.close();
        } catch (Exception e) {
            System.out.println("❌ MySQL 연결 실패!");
            e.printStackTrace();
        }
    }
}
