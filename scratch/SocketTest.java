import java.net.DatagramSocket;
import java.net.SocketException;

public class SocketTest {
    public static void main(String[] args) {
        try {
            DatagramSocket socket = new DatagramSocket();
            System.out.println("✅ Socket created successfully!");
            socket.close();
        } catch (SocketException e) {
            System.err.println("❌ Socket creation failed: " + e.getMessage());
            System.exit(1);
        }
    }
}
