+++
title = "Mounting NTFS drives on FreeBSD 14.1"
date = 2024-12-01
[taxonomies]
categories = ["sysadmin", "unix"]
+++

### Introduction

On a fresh install of FreeBSD 14.1 I ran into the problem of mounting my NTFS partitions which had backed up data from a previous Windows install. While there are many resources solving this problem for older versions of FreeBSD (some of them listed in the references), I found them all outdated in one way or another.

In this post I'll demonstrate how you can mount NTFS partitions on FreeBSD 14.1, including working /etc/fstab entries so that they can be mounted on boot.

### Guide

First, we have to find our NTFS partitions. The easiest way I've found to do this is by using Vermaden's lsblk script (which mimics the Linux tool of the same name):

```bash
curl https://raw.githubusercontent.com/vermaden/lsblk/refs/heads/master/lsblk -o lsblk.sh
chmod +x ./lsblk.sh
./lsblk.sh
```

Based on the \`ms-basic-data\` partitions in the output, I can tell the NTFS partitions I'm looking for are ada0p1 and ada1p1.

Now we can work on mounting them. As root:

```bash
# Install FUSE and its NTFS driver
pkg install fuse fuse-utils fusefs-ntfs
# Load the fusefs kernel driver
kldload fusefs
# Add it to /boot/loader.conf so it loads on boot before mounts occur
echo 'fusefs_load="YES"' | tee -a /boot/loader.conf

# Mount the partitions using ntfs-3g
mkdir /mnt/hdd
ntfs-3g /dev/ada0p1 /mnt/hdd
mkdir /mnt/sdd
ntfs-3g /dev/ada1p1 /mnt/sdd
```

To have these partitions mount on boot, we can add the following lines to the /etc/fstab file:

```fstab
# /etc/fstab...
/dev/ada0p1 /mnt/hdd fuse rw,auto,mountprog=/usr/local/bin/ntfs-3g 0 0
/dev/ada1p1 /mnt/sdd fuse rw,auto,mountprog=/usr/local/bin/ntfs-3g 0 0
```

If you haven't already mounted the partitions with ntfs-3g, you can test this with \`mount -a\`

### References

- ['NTFS on FreeBSD' at gridbugs.org](https://www.gridbugs.org/ntfs-on-freebsd/)
- ['Mounting NTFS on FreeBSD' on kflu.github.io](http://kflu.github.io/2018/02/03/2018-02-03-freebsd-ntfs/)
- ['Formatting, partitioning, and mounting drives for NTFS with FreeBSD and Mac OS X' on chieflemming.wordpress.com](https://chieflemming.wordpress.com/2020/01/08/formatting-partitioning-and-mounting-drives-for-ntfs-with-freebsd-and-mac-os-x/)
- ['How to mount NTFS during FreeBSD installation process ?'](https://forums.freebsd.org/threads/how-to-mount-ntfs-during-freebsd-installation-process.71619/)
- [Vermaden's lsblk script](https://raw.githubusercontent.com/vermaden/lsblk/refs/heads/master/lsblk)