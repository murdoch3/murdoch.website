+++
title = "HTB Methodology"
date = 2024-07-14
[taxonomies]
categories = ["ctfs"]
+++

## Introduction

This is a collection of notes, commands, and bullet points to reference when I am working through HackTheBox or other Boot2Root machines. This will be periodically updated with new techniques I find over the course of my hacking and research.

## Enumeration

### Nmap Scan

```bash
sudo nmap -v -sS -A -Pn -T5 -p- -oN nmap.txt <ip>
```

### Discovered Applications

- Determine versions
- Look up known vulnerabilities and exploits
- Look up default credentials

### Web Enumeration

#### Gobuster

HTTP:

```bash
gobuster dir -u http://<ip address> -w /usr/share/seclists/Discovery/Web-Content/directory-list-lowercase-2.3-medium.txt -x php,html,txt -r -t 100 -o gobuster-80.txt
```

HTTPS:

```bash
gobuster dir -k -u https://<ip address> -w /usr/share/seclists/Discovery/Web-Content/directory-list-lowercase-2.3-medium.txt -x php,html,txt -r -t 100 -o gobuster-443.txt
```

#### Subdomain/Vhost Enumeration

```bash
ffuf -w subdomains.txt -u http://website.com -H "Host: FUZZ.website.com" -o subdomain-scan.txt
```

Exclude results with a given size:

```bash
ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -u http://devvortex.htb -H "Host: FUZZ.devvortex.htb" -fs 154
```

### Web Application Vulnerabilities

- SQL injection
- Template injection
- XSS (cookie/session stealing)
- Directory traversals
- Local/remote file inclusion
- Code injection

### Password Cracking

```bash
hashcat -m 3200 hash.txt /path/to/wordlist
john --format=bcrypt hash.txt --wordlist=/path/to/wordlist
```

## Linux Privilege Escalation

### Useful Commands

```bash
# Find OS version / installed applications 
uname -a
dpkg -l
rpm -qa
apt list --installed
```

[linPEAS](https://github.com/peass-ng/PEASS-ng/tree/master/linPEAS)

### Linux Privesc Checklist

- Vulnerable services running as root (`ps aux | grep "^root"`)
- Readable/writable system files (/etc/passwd, /etc/shadow)
- SUDO/SUID/SGID privesc:
  
  - [GTFOBins](https://gtfobins.github.io/)
  - `sudo -l`
- Check cron jobs for weak file permissions, wildcards, etc.
  
  - `find / -type f -name "*cron*"`
- Check for passwords/keys in config, history, backups and databases
- Check for NFS shares with no root squashing

## Windows Privilege Escalation

### Common Commands

```batch
net user <username> <password> /add
net localgroup <group> <username> /add 
systeminfo
```

### Common Tools

- [winPEAS](https://github.com/peass-ng/PEASS-ng/tree/master/winPEAS) (lots of output)
- [PsExec](https://learn.microsoft.com/en-us/sysinternals/downloads/psexec)
- [Nishang Scripts](https://github.com/samratashok/nishang)
- [Exploit Suggester](https://github.com/bitsadmin/wesng)
- [Accesschk](https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk) (view ACLs for different resources)
- [plink.exe](https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html)

### Windows Privesc Checklist

- Modifiable services
- Unquoted service paths
- Writable registry service path
- DLL hijacking
- AlwaysInstallElevated (.msi files)
- Saved credentials
- Pass the hash
- Scheduled tasks
- Potato attacks
- User privileges (`whoami /all`)