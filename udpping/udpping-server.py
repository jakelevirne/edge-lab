import socket

# The IP address and port the server will listen on
server_ip = '0.0.0.0'  # Listen on all available interfaces
server_port = 12345  # The port you're "pinging"

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Bind the socket to the IP and port
sock.bind((server_ip, server_port))

print(f"Listening for UDP packets on {server_ip}:{server_port}...")

# Loop forever
while True:
    data, addr = sock.recvfrom(1024)  # Buffer size is 1024 bytes
    print(f"Received message: {data} from {addr}")

    # Echo the message back to the sender
    sock.sendto(data, addr)

