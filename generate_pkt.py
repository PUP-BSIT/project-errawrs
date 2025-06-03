from scapy.all import *
import datetime

def generate_pkt_file():
    # Create a list to store packets
    packets = []
    
    # Create some sample packets
    # ICMP (ping) packet
    icmp_packet = IP(dst="8.8.8.8")/ICMP()
    packets.append(icmp_packet)
    
    # TCP packet
    tcp_packet = IP(dst="192.168.1.1")/TCP(dport=80)
    packets.append(tcp_packet)
    
    # UDP packet
    udp_packet = IP(dst="192.168.1.1")/UDP(dport=53)
    packets.append(udp_packet)
    
    # Save packets to a pcap file
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"capture_{timestamp}.pcap"
    wrpcap(filename, packets)
    print(f"Generated packet capture file: {filename}")

if __name__ == "__main__":
    generate_pkt_file() 