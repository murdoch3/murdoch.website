+++
title = "Automate FlareVM with Vagrant"
date = 2024-08-22
[taxonomies]
categories = ["automation", "malware-analysis"]
+++

## Introduction

Whenever I have to handle malicious files, write malicious code, or perform malware analysis and reverse engineering, I like to use Mandiant's FlareVM because it provides all of tools that I need out of the box.

The only problem with Flare is that the installation process is manual and time-consuming. It requires users to:

1. Create a Windows 10 virtual machine
2. Complete the Windows 10 installation process
3. Follow a process to disable Windows Defender in the settings and group policy editor
4. Download, unblock, and execute the Flare install PowerShell script
5. Babysit Flare during its installation (make choices when prompted, login after reboots, etc.)

I myself have gone through this process more than a dozen times in the recent years, a result of moving between systems. This results in wasted time that could have been spent on analysis and research.

## Vagrantfile

To solve this problem, I have spent the past few days creating a Vagrantfile to automate the provisioning and installation of FlareVM on HyperV. I have managed to make the installation completely hands-off. The complete code can be seen below:

```ruby
$autologon = <<-SCRIPT
Set-ItemProperty -Path "HKLM:/SOFTWARE/Microsoft/Windows NT/CurrentVersion\\Winlogon" -Name "AutoAdminLogon" -Value "1"
wget https://download.sysinternals.com/files/AutoLogon.zip -O C:\\ProgramData\\AutoLogon.zip
Expand-Archive C:\\ProgramData\\AutoLogon.zip -DestinationPath C:\\ProgramData\\AutoLogon
C:/ProgramData/AutoLogon/Autologon64.exe "vagrant" "FLAREVM" "vagrant" /accepteula
SCRIPT

$disable_defender = <<-SCRIPT 
wget https://github.com/ionuttbara/windows-defender-remover/archive/refs/heads/main.zip -O C:\\ProgramData\\main.zip
Expand-Archive C:\\ProgramData\\main.zip -DestinationPath C:\\ProgramData
C:\\ProgramData\\windows-defender-remover-main\\Script_Run.bat y
SCRIPT

$script = <<-SCRIPT
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/murdoch3/flare-vm/main/install.ps1" -OutFile "$env:USERPROFILE\\Desktop\\install.ps1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/murdoch3/flare-vm/main/config.xml" -OutFile "$env:USERPROFILE\\Desktop\\config.xml"
Unblock-File "$env:USERPROFILE\\Desktop\\install.ps1"
Set-ExecutionPolicy Unrestricted -Scope Process -Force
Set-ExecutionPolicy Unrestricted -Scope CurrentUser -Force
Set-ExecutionPolicy Unrestricted -Scope LocalMachine -Force
&"$env:USERPROFILE\\Desktop\\install.ps1" -customConfig  "$env:USERPROFILE\\Desktop\\config.xml" -password vagrant -noWait -noGui
SCRIPT

Vagrant.configure("2") do |config|
  config.vm.box = "gusztavvargadr/windows-10"
  config.vm.hostname = "FlareVM"
  config.vm.synced_folder '.', '/vagrant', disabled: true
  
  config.vm.provider "hyperv" do |vb|
    vb.memory = 5000
    vb.cpus = 4
  end
  
  # Debugged using https://stackoverflow.com/questions/49547740/what-does-this-vagrant-error-mean-and-how-do-you-fix-it-for-public-network-an
  config.vm.network "private_network", type: "dhcp", netmask: "255.255.255.0", dhcp_ip:"192.168.56.100", dhcp_lower: "192.168.56.101", :dhcp_upper=>"192.168.56.254"
  
  # autologon should allow the scripts to automatically continue after reboot
  # without user involvement
  config.vm.provision "autologon", type: "shell", privileged: true do |s|
    s.inline = $autologon
  end
  
  config.vm.provision "disable-defender", type: "shell", privileged: true do |s|
    s.inline = $disable_defender
  end
  
  config.vm.provision "set-autologon-key", type: "shell", privileged: true, run: "never" do |s|
    s.inline ='Set-ItemProperty -Path "HKLM:/SOFTWARE/Microsoft/Windows NT/CurrentVersion\\Winlogon" -Name "AutoAdminLogon" -Value "1"; C:/ProgramData/AutoLogon/Autologon64.exe "vagrant" "FLAREVM" "vagrant" /accepteula; Restart-Computer -Force'
  end
  
  config.vm.provision "flare-install", type: "shell", privileged: true, run: "never" do |s|
    s.inline = $script
  end
end
```

### Usage:

Requirements: Vagrant, HyperV, and sufficient disk space for the gusztavvargadr/windows-10 Vagrant box and the FlareVM installation.

Get the latest version of the Vagrant file from [here](https://github.com/murdoch3/FlareVagrant).

To use this Vagrantfile to create a FlareVM virtual machine, run the following commands:

```batch
vagrant up;  
vagrant up --provision-with set-autologon-key;  
vagrant up --provision-with flare-install
```

The first command will provision the virtual machine on HyperV, set the autologon credentials and permanently delete Windows Defender. The second will set the AutoAdminLogon registry key and triggers a restart (this sometimes shows errors, but it is the only way I could get auto login to work). The third will install FlareVM.

## How It Works

The Vagrantfile automates the process of provisioning and deploying FlareVM by performing the following tasks:

1. **Virtual Machine Provisioning:** To provision the VM, I specified that we want to pull the gusztavvargadr/windows-10 Vagrant box and configured our VM settings, including the VM's hostname, provider (i.e., VirtualBox, HyperV, etc.), hardware requirements, and networking configuration.
   
   ```ruby
   #...
   Vagrant.configure("2") do |config|
       config.vm.box = "gusztavvargadr/windows-10"
       config.vm.hostname = "FlareVM"
       config.vm.synced_folder '.', '/vagrant', disabled: true
   
       config.vm.provider "hyperv" do |vb|
       vb.memory = 5000
       vb.cpus = 4
       end
   
       config.vm.network "private_network", type: "dhcp", netmask: "255.255.255.0", dhcp_ip:"192.168.56.100", dhcp_lower: "192.168.56.101", :dhcp_upper=>"192.168.56.254"
   
       # ... provisioning code
   end
   ```
2. **Disabling** **Windows Defender:** After trying all of Flare's linked resources without success, I discovered [this repo](https://github.com/ionuttbara/windows-defender-remover/). This is the only automated way I've found to remove Windows Defender from this version of Windows 10. The vagrant provision step downloads the repo and runs `Script\_Run.bat y`. This will delete Windows Defender by applying a series of registry changes and then deleting Defender related files from C:\\Windows\\WinSxS, C:\\Windows\\System32, C:\\Windows\\Program Files (x86)\\, etc.
   
   ```ruby
   # Powershell provision script
   $disable_defender = <<-SCRIPT 
   wget https://github.com/ionuttbara/windows-defender-remover/archive/refs/heads/main.zip -O C:\\ProgramData\\main.zip
   Expand-Archive C:\\ProgramData\\main.zip -DestinationPath C:\\ProgramData
   C:\\ProgramData\\windows-defender-remover-main\\Script_Run.bat y
   SCRIPT
   
   # ...
   
   Vagrant.configure("2") do |config|
       # ...
       # Use this provisioning step to delete defender using our script
       config.vm.provision "disable-defender", type: "shell", privileged: true do |s|
         s.inline = $disable_defender
       end
       # ...
   end
   ```
3. **Enabling Autologon:** Enabling Autologon is necessary to prevent the user from having to manually login during the Flare installation. The only way I could get this to work with Vagrant was to perform it in two steps, the first downloading and executing the SysInternals Autologon tool to set the autologon credentials, and the second to set the AutoAdminLogon registry key and reboot (unfortunately, uncleanly).
   
   ```ruby
   # ...
   $autologon = <<-SCRIPT
   Set-ItemProperty -Path "HKLM:/SOFTWARE/Microsoft/Windows NT/CurrentVersion\\Winlogon" -Name "AutoAdminLogon" -Value "1"
   wget https://download.sysinternals.com/files/AutoLogon.zip -O C:\\ProgramData\\AutoLogon.zip
   Expand-Archive C:\\ProgramData\\AutoLogon.zip -DestinationPath C:\\ProgramData\\AutoLogon
   C:/ProgramData/AutoLogon/Autologon64.exe "vagrant" "FLAREVM" "vagrant" /accepteula
   SCRIPT
   
   # ...
   
   Vagrant.configure("2") do |config|
       # ...
       config.vm.provision "autologon", type: "shell", privileged: true do |s|
         s.inline = $autologon
       end
   
       config.vm.provision "set-autologon-key", type: "shell", privileged: true, run: "never" do |s|
         s.inline ='Set-ItemProperty -Path "HKLM:/SOFTWARE/Microsoft/Windows NT/CurrentVersion\\Winlogon" -Name "AutoAdminLogon" -Value "1"; C:/ProgramData/AutoLogon/Autologon64.exe "vagrant" "FLAREVM" "vagrant" /accepteula; Restart-Computer -Force'
       end
   
       # ...
   end
   ```
4. **FlareVM Installation:** The last step is to download and execute the Flare install script. It uses a custom version of the script with a few of the initial prompts commented out. The flags -customConfig, -password, -noWait, and -noGui are used to make the rest of the process automated.
   
   ```ruby
   # ...
   $script = <<-SCRIPT
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/murdoch3/flare-vm/main/install.ps1" -OutFile "$env:USERPROFILE\\Desktop\\install.ps1"
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/murdoch3/flare-vm/main/config.xml" -OutFile "$env:USERPROFILE\\Desktop\\config.xml"
   Unblock-File "$env:USERPROFILE\\Desktop\\install.ps1"
   Set-ExecutionPolicy Unrestricted -Scope Process -Force
   Set-ExecutionPolicy Unrestricted -Scope CurrentUser -Force
   Set-ExecutionPolicy Unrestricted -Scope LocalMachine -Force
   &"$env:USERPROFILE\\Desktop\\install.ps1" -customConfig  "$env:USERPROFILE\\Desktop\\config.xml" -password vagrant -noWait -noGui
   SCRIPT
   
   # ...
   
   Vagrant.configure("2") do |config|
       # ...
       config.vm.provision "flare-install", type: "shell", privileged: true, run: "never" do |s|
         s.inline = $script
       end
       # ...
   end
   ```

## Problems Faced

### Vagrant/Virtualbox: The DHCP on this adapter is incompatible with the DHCP settings

Initially when I was using Vagrant and Virtualbox, I ran into this error. It was fixed by changing the initial network line:

```ruby
config.vm.network "private_network", type: "dhcp"
```

To include the Virtualbox's Host-Only network's DHCP information:

```ruby
config.vm.network "private_network", type: "dhcp", netmask: "255.255.255.0", dhcp_ip:"192.168.56.100", dhcp_lower: "192.168.56.101", :dhcp_upper=>"192.168.56.254"
```

### Vagrant Stuck on Preparing SMB Shared Folders

This was solved by just disabling the default vagrant shared folder:

```ruby
config.vm.synced_folder '.', '/vagrant', disabled: true
```

### Set-ExecutionPolicy: The Setting is Overridden by a Policy Defined at a More Specific Scope

I believe this problem has to do with the default ExecutionPolicy of the vagrant box, which can be seen with Get-ExecutionPolicy -List. While it's not elegant, I found setting the execution policies as follows to work consistently:

```powershell
Set-ExecutionPolicy Unrestricted -Scope Process -Force
Set-ExecutionPolicy Unrestricted -Scope CurrentUser -Force
Set-ExecutionPolicy Unrestricted -Scope LocalMachine -Force
```

## Conclusion

In conclusion, using this Vagrantfile significantly streamlines the creation of a FlareVM virtual machine by fully automating the process.

As always, there is room for improvement. Further work could include:

- Performing the Vagrant installation in a single command.
- Making the Windows Defender Remover script and autologon provisioning Vagrant-compatible by performing the restart with Vagrant reload.
- Creating equivalent VMWare and VirtualBox Vagrantfiles.
- Creating and using a custom Flare ISO or Vagrant box.