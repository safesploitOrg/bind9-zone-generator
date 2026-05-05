# DNSmasq hosts.d to BIND9 Zone Generator

A simple web-based tool to convert dnsmasq-style host records from `hosts.d` files into BIND9 forward and reverse zone files. Perfect for migrating DNS configurations from dnsmasq to BIND9 or generating zone files for internal networks.

## ✨ Features

- **Input Parsing**: Paste dnsmasq-style host records (format: `IP primary-host alias1 alias2`)
- **Network Filtering**: Only process records matching a specified network prefix
- **Forward Zone Generation**:
  - Option for full zone file (with SOA/NS records) or include file (records only)
  - Primary hostname becomes A record
  - Additional hostnames become CNAME records
- **Reverse Zone Generation**: Automatic PTR records for reverse DNS
- **Validation & Warnings**: Detects potential issues like duplicate hostnames, invalid IPs, etc.
- **Copy & Download**: Easy export of generated zone files
- **Customizable**: Configure domain, TTL, DNS host, admin name, and more

## 📖 Usage

1. **Configure Settings**:
   - **Forward zone domain**: Your domain (e.g., `example.com`)
   - **Network prefix filter**: IP prefix to match (e.g., `192.168.1.`)
   - **Authoritative DNS host**: Name for SOA/NS records
   - **SOA admin name**: Admin contact for SOA
   - **TTL**: Time-to-live for records
   - **Output mode**: Choose between full zone file or include file

2. **Paste Host Records**:
   - Enter dnsmasq-style entries, one per line
   - Format: `IP primary-hostname alias1 alias2`
   - Example:
     ```
     192.168.1.10 server1 srv1
     192.168.1.20 webserver www
     ```

3. **Generate Zones**:
   - Click "Generate BIND9" to create forward and reverse zone files
   - Review validation warnings if any
   - Copy or download the output

4. **Output**:
   - **Forward Zone**: A records for primary hosts, CNAMEs for aliases
   - **Reverse Zone**: PTR records for reverse DNS lookup

## 🤝 Contributing

Contributions welcome! This is a simple static site, so:

1. Fork the repository
2. Make your changes to `index.html`
3. Test locally
4. Submit a pull request

## 📄 License

MIT License - feel free to use and modify as needed.

## 🙏 Acknowledgments

Built with vanilla HTML, CSS, and JavaScript. Inspired by the need to migrate DNS configurations from dnsmasq to BIND9 in enterprise environments.