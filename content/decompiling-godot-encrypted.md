+++
title = "Decompiling an Encrypted Godot 3.5.1 Game"
date = 2025-05-30
[taxonomies]
categories = ["reversing"]
+++

*Disclaimer: This guide is intended for educational use only.*
## Decryption 

### Problem 

When we try to recover an encrypted Godot project with Godot RE Tools ([link](https://github.com/GDRETools/gdsdecomp)), we get the following error:
![](/img/DecompilingGodotEncrypted/img7.png)

However, in this version of Godot, the key is stored unobfuscated within the game executable.  This post will show the process of finding this key in an project I exported myself (as discussed in the appendix).
### Finding the Key

#### Analyzing Godot's Source Code  

Since Godot is open-source, we can start our search by grep'ing over the source code for places where encryption, decryption, or keys are mentioned.  Searching for `encryption`, an interesting reference to `script_encryption_key` is found:
![](/img/DecompilingGodotEncrypted/img8.png)

The reference is found in gdscript.cpp's GDScript::load_byte_code method, which we know is used for the decryption process at runtime based on [this documentation page](https://docs.godotengine.org/en/3.5/development/compiling/compiling_with_script_encryption_key.html):
![](/img/DecompilingGodotEncrypted/img9.png)

Viewing this block of code in VS Code, we can see that the key is read into a uint8 Vector and is used to decrypt a file with AES256 ECB.  This step is performed for file paths ending in "gde".  As "gd" is the standard file extension for Godot scripts, it seems likely this function is being used to decrypt each of the game's encrypted scripts.
![](/img/DecompilingGodotEncrypted/img10.png)

At this point, we want to see if we can find this function in a disassembler.  Luckily, Godot prints many useful error messages that we can use to perform string searches.  For example, we can peek at the macro expansion for the ERR_FAIL_COND_V macro seen above:
![](/img/DecompilingGodotEncrypted/img11.png)

#### Finding the Decryption Routine in IDA 

Using IDA, we can use the Strings subview and filter for a string matching the ERROR string we found from the expanded macro above:
![](/img/DecompilingGodotEncrypted/img13.png)

We can now go to the address of the top result, the only string to match ours exactly.  Viewing the xrefs will take us to the function where it is used, which IDA has named `sub_1400DAE00` for my example binary.

#### Finding the Key 

Having found the `load_byte_code` function, we can begin to look for the `script_execution_key`.  We know from the source code that it is copied over, one byte at a time, to a new vector, and that this is the only loop construct in the function.

Shortly after the condition string is referenced, we find such a loop construct in the IDA decompilation:
```C
	//...
	v87 = 0;
	sub_140013410(&v87, 32);
	v12 = 0;
	for ( i = 0; ; ++i )
	{
		v14 = 0;
		if ( v87 )
			v14 = (int *)(v87 - 4);
		v15 = v14 ? *v14 : 0;
		if ( v12 >= v15 )
			break;
		if ( i < 0 || (!v87 || v87 == 4 ? (v16 = 0) : (v16 = *(_DWORD *)(v87 - 4)), v12 >= v16) )
		{
			if ( v14 )
				v4 = *v14;
			sub_1415436C0(
			  (unsigned int)"VectorWriteProxy<unsigned char>::operator []",
			  (unsigned int)"C:\\Users\\murdoch\\Downloads\\godot-3.5.1-stable\\core/vector.h",
			  49,
			  v12,
			  v4,
			  (__int64)"p_index",
			  (__int64)"((Vector<T> *)(this))->_cowdata.size()",
			  (__int64)&Locale,
			  1);
			sub_141543420();
			__debugbreak();
		}
		sub_140008C90(&v87);
		*(_BYTE *)(i + v87) = byte_1421E11B8[i];
		++v12;
	}
    //...
```

Without having to tease out much, we can tell that the static variable `byte_1421E11B8` is likely what we're looking for.  This is because it is a static variable being read, one byte each iteration, into another buffer, just like in the source code.  Furthermore, we can see v87, the buffer the bytes are written into, appears to be initialized to size 32 before the loop via `sub_140013410`.

When we access `byte_1421E11B8`, we find our 32-byte key:
```
.data:0000000142159E38 byte_142159E38  db 60h, 0C1h, 1Fh, 4Ah, 0DBh, 59h, 28h, 0EDh, 0Ch, 80h
.data:0000000142159E38                                         ; DATA XREF: sub_1400DAE00+18D↑o
.data:0000000142159E42                 db 15h, 30h, 47h, 9Ah, 0EFh, 8Dh, 58h, 0F7h, 0C2h, 0F0h
.data:0000000142159E4C                 db 89h, 43h, 8, 0C2h, 0E9h, 44h, 6Ch, 0ECh, 5Bh, 37h, 3Eh
.data:0000000142159E57                 db 0FEh, 8 dup(0)
```

This is the 32-byte key that I generated in the first step of the Appendix.  This key can then be used in Godot RE Tools to decrypt the Godot project's scripts.
## Appendix: Building an Encrypted Godot 3.5.1 Project 

Documentation: [Here](https://docs.godotengine.org/en/3.5/development/compiling/compiling_with_script_encryption_key.html)

I'm just using the Godot Third-Person Shooter Demo to test.

First we need to generate a key to use for encryption:
![](/img/DecompilingGodotEncrypted/img1.png)

To be able to use encryption, we need to build our own export templates, using an environment variable to specify our encryption key.  The documentation for this process can be found [here](https://docs.godotengine.org/en/stable/contributing/development/compiling/compiling_for_windows.html#creating-windows-export-templates).  Below are the PowerShell commands I used to build the export templates from the Godot 3.5.1 source (which can be found [here](https://github.com/godotengine/godot/releases/tag/3.5.1-stable)):
```powershell
cd "godot-3.5.1-stable"
$env:SCRIPT_AES256_ENCRYPTION_KEY="60c11f4adb5928ed0c801530479aef8d58f7c2f0894308c2e9446cec5b373efe"
scons platform=windows tools=no target=release_debug bits=32
scons platform=windows tools=no target=release bits=32
scons platform=windows tools=no target=release_debug bits=64
scons platform=windows tools=no target=release bits=64
```

With the export templates built, we can now export our Godot project.  Select Project > Export.

![](/img/DecompilingGodotEncrypted/img2.png)

In the resulting window, select Add > Windows Desktop.

![](/img/DecompilingGodotEncrypted/img3.png)

Under Options > Custom Template, set the path for the Debug and Release templates:
![](/img/DecompilingGodotEncrypted/img12.png)

Then we can set our encryption settings in the script tab:
![](/img/DecompilingGodotEncrypted/img4.png)

Then we can export the project:
![](/img/DecompilingGodotEncrypted/img5.png)

After exporting, we'll find the exported exe and pck files that we will attempt to reverse/extract.
![](/img/DecompilingGodotEncrypted/img6.png)