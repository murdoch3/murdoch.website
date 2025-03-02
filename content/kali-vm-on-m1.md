+++
title = "Setting Up Kali Linux VM/Container with GUI on M-Series Macs"
date = 2024-08-30
[taxonomies]
categories = ["ctfs"]
+++

### Requirements

- M-Series Mac (Apple Silicon)
- At least 12GB of free space (more depending on desired packages)
- [OrbStack](https://docs.orbstack.dev/install) installed
- [NoMachine](https://downloads.nomachine.com/) installed

### Introduction

This guide outlines the process for setting up a Kali Linux virtual machine or container on an M-series Mac. It uses OrbStack, a fast and lightweight alternative to Docker Desktop and virtualization solutions like Parallels. NoMachine is used to get GUI access to Kali.

### Option 1: Installing a Kali Linux VM with OrbStack

#### Create and Setup the VM

1. Create a new Kali Linux VM from OrbStack ![](/img/KaliVMonM1Mac/img1.png)
2. Get a shell on the VM ![](/img/KaliVMonM1Mac/img2.png)
3. Set a password for the user.
   
   ```bash
   sudo passwd user
   ```
4. Update apt packages, install the default system metapackage, and choose a desktop environment.
   
   ```bash
   sudo apt update && sudo apt install -y kali-linux-default kali-desktop-i3
   ```
   
   Note: You can replace `kali-desktop-i3` with the default `kali-desktop-xfce` or another desktop environment/window manager of your choice.
5. Download and install the NoMachine ARM64 package.
   
   ```bash
   wget https://download.nomachine.com/download/8.13/Arm/nomachine_8.13.1_1_arm64.deb
   dpkg -i ./nomachine_8.13.1_1_arm64.deb
   ```
6. Confirm that nxserver is running.
   
   ```bash
   service nxserver status
   ```

#### Connect to the VM

1. Find the IP address of the Kali VM: ![](/img/KaliVMonM1Mac/img3.png)
2. Using the NoMachine Mac client, create a new connection to the VM and connect. ![](/img/KaliVMonM1Mac/img4.png)
3. After going through the connection setup, you will have GUI access to the new Kali VM: ![](/img/KaliVMonM1Mac/img5.png)
   
   #### Troubleshooting
   
   On reboot, eth0 sometimes starts in the DOWN state. I have been able to fix this by restarting the networking service via a terminal to the VM:
   
   ```bash
   sudo service networking restart
   ```

### Option 2: Installing a Kali Linux Container with OrbStack

The same process, with some small changes, can be repeated for creating a Kali Linux container.

1. Create the container:
   
   ```bash
   sudo docker run -d -it --cap-add=SYS_PTRACE kalilinux/kali-rolling
   ```
   
   Note: The `--cap-add=SYS_PTRACE` is required to bypass display startup errors with NoMachine. This solution was found [here](https://forum.nomachine.com/topic/nxframebuffer-failed-to-start-in-docker).
2. Setup the container, performing the same steps as for the VM. We update repositories; install the system metapackage, desktop environment metapackage, and NoMachine; and then finally create the user.
   
   ```bash
   apt update && apt install -y kali-linux-default kali-desktop-i3
   wget https://download.nomachine.com/download/8.13/Arm/nomachine_8.13.1_1_arm64.deb
   dpkg -i ./nomachine_8.13.1_1_arm64.deb
   adduser user
   usermod -aG sudo user
   ```
3. Now the container should be ready. Get its IP address `ip a` and use the Mac NoMachine client to connect to the container, as we did for the VM.

### Post-Install

This provides a base Kali Linux install with some common tools. To get the rest of the tools you may be used to from the full install (e.g. burpsuite), you can either install them individually or through [Kali's tools and menu metapackages](https://www.kali.org/docs/general-use/metapackages/).

### References

- [OrbStack Documentation](https://docs.orbstack.dev/install)
- [NoMachine Downloads](https://downloads.nomachine.com/)
- [Kali Linux Official Documentation](https://www.kali.org/docs/)
- [Mike Esto's Blog Post on OrbStack and NoMachine](https://mikeesto.com/posts/orbstack-nomachine-gui/)