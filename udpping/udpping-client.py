import socket

target_ip = "192.168.86.72"
target_port = 12345

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

try:
    # Send a byte of data
    sock.sendto(b'ping', (target_ip, target_port))
    print(f"UDP packet sent to {target_ip}:{target_port}")
finally:
    sock.close()

