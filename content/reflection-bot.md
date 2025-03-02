+++
title = "Creating a Runescape Reflection Bot from Scratch 2"
date = 2024-05-05
[taxonomies]
categories = ["reversing"]
+++

## Preface

Game hacking and botting were my primary introduction to programming and cybersecurity as a kid. I would listen to Defcon talks (like [this](https://www.youtube.com/watch?v=KmwhrWxpViw) or [this](https://www.youtube.com/watch?v=QoNdhlLPX-g)), read [old histories](https://rshacking.wordpress.com/) of RuneScape hacking, and scroll through forums like UnknownCheats, totally rapt. I was excited by the idea that I would one day be able to understand these exploits of these seemingly impenetrable games that I was so familiar with. It wasn’t about wanting to cheat or make money from hacks for me – it was about the joy of understanding a trick or exploit alone. It was my excitement about learning game hacking that led me to [start learning C++](https://www.google.ca/books/edition/_/1bR0DQEACAAJ?hl=en&sa=X&ved=2ahUKEwjp3oSxo_eFAxWlkIkEHZ--CjwQre8FegQIAxAb) in my early teens, after seeing a now deleted video from one “douggem” on learning game hacking.

Despite being a RuneScape player in my teens and having an interest in these hacks, I was never able to figure out how RuneScape bots were written. While there were many public resources written about different types of bots and how you might write a bot for an existing client, there were little to no resources for how you would start from scratch. This project aims to create a (private server) RuneScape bot using Java’s reflection API to implement an “inventory dropper” – a bot designed to automatically drop all items from the player’s inventory. This is not only to demonstrate the process of bot creation, but also to fill a gap in the public availability of educational resources on RuneScape botting: to help a younger version of myself get a little farther in his hacking goals.

## Introduction

The goal of this project is to write a RuneScape bot using Java’s reflection API. Reflection allows Java to access the data and methods of Java classes at runtime, allowing us to programmatically interact with the running game client. This project seeks to extend an archived tutorial from the EctoTalk forum, which demonstrated the basics of writing a reflection/injection bot client, but stopped short of applying those techniques to write an actual bot. This tutorial will focus only on using reflection towards the end of implementing an “inventory dropper” bot – automating the process of dropping all items in the player’s inventory. While simple, this will allow us to demonstrate how reflection can be strategically used to implement a bot using fields and methods discovered by reverse engineering the client.

## Prior Work

During my research for this project, the only resource I found that shows how you might begin to write a reflection bot from scratch was [this thread](https://web.archive.org/web/20200219171455/https://ectotalk.com/index.php?threads%2Fultimate-guide-how-to-write-a-runescape-injection-bot.6%2F), by a “Shenandoah”, on the now offline forum EctoTalk. While the post is about writing an injection bot, it also makes use of Java reflection to load the game’s client into our own process, giving us control over it. It is this code from this post that this project extends. Reading posts #1 and #2 up to the “Bytecode Basics” section can be considered required conceptual reading for this article.

Like him, we’ll be using the open-source Runescape private server [2006scape](https://github.com/2006-Scape/2006Scape) as the target for our bot.

## Java Reflection

There are three main steps this bot must perform:

1. Loading the game into a bot-controlled process
2. Reading the inventory array and inventory interface position information to find the location of items on the screen
3. Triggering drop events on each of the found items in the inventory

We will implement these three steps using Java’s reflection API. The [reflection API](https://docs.oracle.com/javase/8/docs/api/java/lang/reflect/package-summary.html) allows a program to access the fields and methods of loaded classes at runtime. I will now give you a high-level idea of how we can use reflection to implement of these steps:

1. The core Game class for Runescape extends Applet (or a subclass of Applet). We can load this class and then use reflection to instantiate it. This gives us a running instance of the game, within our bot process, that we can further interact with using reflection.
2. After finding the inventory array by reverse engineering the client – which is the trickiest part of the project – we can use reflection to make the field public and get its value. This is basically the same for finding the inventory positions.
3. Drop events can be triggered in Runescape by shift-clicking on the items of a player’s inventory. We can programmatically create our own keyboard and mouse events to simulate those, using reflection to submit them directly to the applet’s handlers.

## Technical Breakdown

The code for this project can be found [here](https://github.com/murdoch3/DropperReflectionBot).

In implementing the bot, I used four classes: [Main](https://github.com/murdoch3/DropperReflectionBot/blob/main/src/main/java/org/example/Main.java), [ReflectionUtils](https://github.com/murdoch3/DropperReflectionBot/blob/main/src/main/java/org/example/ReflectionUtils.java), [ReflectionBot](https://github.com/murdoch3/DropperReflectionBot/blob/main/src/main/java/org/example/ReflectionBot.java) and [BotKeyListener](https://github.com/murdoch3/DropperReflectionBot/blob/main/src/main/java/org/example/BotKeyListener.java). As Main simply creates an instance of ReflectionBot, I will skip describing it further. Let’s break the remaining down class by class.

### ReflectionUtils

ReflectionUtils provides three utility functions common to reflection operations that access fields or invoke methods. These functions save having to repeat the same code over and over again.

#### getField

```java
public static Field getField(Class&lt;?&gt; cl, String fieldName) throws
NoSuchFieldException {

    Field field = cl.getDeclaredField(fieldName);

    field.setAccessible(true);

    return field;

}
```

The first method, getField, takes a loaded class and a string fieldName, and returns a Field. The Field represents a variable attached to a class that we are accessing through reflection. This Field can later be used to get or set the field on an instance of that class. By setting the field as accessible, we are bypassing Java’s access checking for the field. For us, this means we can access private fields.

#### setField

```java
public static void setField(Class<?> cl, String fieldName, Object object, Object value) throws NoSuchFieldException, IllegalAccessException {
    Field field = *getField*(cl, fieldName);
    field.set(object, value);
}
```

The second method, setField, takes a loaded class, a string FieldName, an Object that is an instance of the class, and a value to set the field to on the object. This is basically just a wrapper around getField, with an additional call to the field’s set method. Note: if you wanted to get a field’s value on an object, you could use the field’s get method, similarly to the way set is used here.

#### invokeMethod

```java
public static Object invokeMethod(Class<?> cl, String methodName, Class<?>[] parameterTypes, Object object, Object[] args) throws NoSuchMethodException, InvocationTargetException, IllegalAccessException {

    Method method = cl.getDeclaredMethod(methodName, parameterTypes);
    method.setAccessible(true);
    return method.invoke(object, args);

}
```

The third method, invokeMethod, takes a loaded class, string methodName, a list of classes representing the parameter types, an object that is an instance of the class to invoke the method on, and a list of arguments corresponding to the parameters. Like with the fields, this method uses reflection to find the declared method with the given name and parameters and bypass access checks, but now also invokes it on the given object with the given arguments.

### ReflectionBot

The job of this class is to load the game client, instantiate its main game class, and to load the game applet into its own window. This part is largely taken, with modifications, from the original EctoTalk post. As such, I will only cover it briefly in this section.

After loading the client’s JAR file (JAR files being used to distribute Java executables) we create an instantiate the client’s game class:

```java
// Load Game class
gameClass = cl.loadClass("Game");
Constructor<?> gameClassInit = gameClass.getDeclaredConstructor();
gameClassInit.setAccessible(true); // turn off access checking
applet = (Applet)gameClassInit.newInstance();
```

Then we can initialize our own JFrame, representing a window, and add this game applet to it. This will result in the game running within our own window.

```java
JFrame frame = new JFrame("Bot");
frame.setDefaultCloseOperation(JFrame.*EXIT\_ON\_CLOSE*);
frame.setMinimumSize(new Dimension(765+8, 503+28));
frame.setLocationRelativeTo(null);
frame.add(applet);
frame.setVisible(true);
```

Finally for the game class, we initialize its fields and call its parent’s init function, just as are done in the client’s main function. (Since we are skipping the main class by creating the game object directly, we have to recreate its steps.)

```java
// Recreating 2006rebotted's main class
setField(gameClass, "nodeID", applet, 10);
setField(gameClass, "portOff", applet, 0);
invokeMethod(gameClass, "setHighMem", new Class[]{}, applet, new Object[]{});

setField(gameClass, "isMembers", applet, true);
Class<?> signLink = cl.loadClass("Signlink");
setField(signLink, "storeid", signLink, 32);
invokeMethod(signLink, "startpriv", new Class[]{InetAddress.class}, signLink, new Object[]{InetAddress.getLocalHost()});

// calling this RSApplet method
invokeMethod(gameClass.getSuperclass(), "initClientFrame", new Class[]{int.class, int.class}, applet, new Object[]{503, 765});
```

At this point the applet has been created successfully, and the game will run like normal. The last step is to attach our own key listener to trigger on key events. This will be the entry point for our bot functionality.

```java
BotKeyListener botKeyListener = new BotKeyListener(this);
invokeMethod(Component.class, "addKeyListener", new Class[]{KeyListener.class}, applet, new Object[]{botKeyListener});
```

### BotKeyListener

BotKeyListener is the class that does the actual work of the bot. It will listen for key presses on the applet, and upon detecting the arbitrary start key, will use reflection to drop the items in the player’s inventory. Reflection is used to submit the bot’s virtual key and mouse events directly to the game applet’s key and mouse listeners. Simulating user input in this way is the simplest way I found to trigger actions with the game – there does not appear to be any single function that performs an item drop that we could call.

An input method leaves us with having to find out what entities to perform inputs on. In this case, I needed to find where the inventory field and inventory interface information was being stored in the client. From this, we would be able to determine the positions of each item in the player’s inventory and use key and mouse events to trigger a drop on it.

#### Finding the Inventory Fields

While it was tricky to determine exactly how to submit the mouse events to the game applet, most of the work of this bot was reverse engineering the client to find the inventory fields. I wanted to find two main things:

- The inventory field: I was expecting to find an array or list that would represent the items in the player’s inventory. This would allow us to reflectively find which slots of the inventory had items in it, making the bot more efficient.
- The inventory interface class/fields: This would be the implementation for the inventory’s GUI in the game. Finding this would allow us to reflectively find where on the screen we would need to click.

Starting with a clone of the [game’s repo](https://github.com/2006-Scape/2006Scape), I grep’d for “inventory”:

![](/img/CreatingABotFromScratch/image2.png)

Seeing that class9\_1 in Game has an “isInventoryInterface” field, I went into the class to find what class9\_1 was:

```java
// ...
RSInterface class9_1 = RSInterface.interfaceCache[class9.children[l1]];
// ...
```

Looking now at the RSInterface class, we find that it has an inv\[] array and a method swapInventoryItems:

```java
public void swapInventoryItems(int i, int j) {
    int k = inv[i];
    inv[i] = inv[j];
    inv[j] = k;
    k = invStackSizes[i];
    invStackSizes[i] = invStackSizes[j];
    invStackSizes[j] = k;
}
```

To find out if these are the right fields, and how we can get the right RSInterface, we can set a breakpoint on the first line of this function, and then try swapping two items. After the breakpoint hits, we see:

![](/img/CreatingABotFromScratch/image5.png)

The inv array is 28 items long, which is the maximum number of items in the player’s inventory. Further, the integers correspond to the items in my character’s inventory – the item ID 441 represents Iron Ore, and 0 represents an empty slot. We now know that if we can find the correct RSInterface, we can access the player’s current inventory reflectively.

To find the correct interface, we can move up the call stack to mainGameProcessor. The call to swapInventoryItems is on a class9:  
![](/img/CreatingABotFromScratch/image1.png)

Which is defined by:

![](/img/CreatingABotFromScratch/image4.png)

3214 is the index into the static field interfaceCache used to access the inventory’s RSInterface. Through the rest of my testing, I confirmed that this index is consistently used between runs and throughout the code. With this, we have found a way to access the inventory interface and the player’s inventory reflectively.

Some GUI information is also attached to this class, including the width, height, invSpritePadX and invSpritePadY, but we still need to find out how to find the start coordinates of the inventory GUI reflectively. This can be found by breaking on the following lines of the buildInterfaceMenu:

![](/img/CreatingABotFromScratch/image3.png)

where i2 and j2 are the inventory interface’s x and y coordinates. As this is being calculated outside of the class using a parent interface, I opted to just hardcode these values for the bot.

#### Performing the Inventory Drop

Now that we have found our method of input and our inventory interface fields, we can put the bot together.

The work of the bot is in the keyPressed function. The bot starts on a key pressed event for the forward slash key.

```java
public void keyPressed(KeyEvent e) {
    if (e.getKeyChar() == '/') {
        // ...
    }
}
```

The first event we’ll send is a key down event for the shift key. When you click on an inventory item with the shift key pressed, the clicked item will be dropped.

```java
// Send shift down. With shift-drop enabled, clicking on an item will cause it to be dropped.
KeyEvent keyEvent = new KeyEvent(bot.applet, 0, 0, 0, KeyEvent.VK_SHIFT, KeyEvent.CHAR_UNDEFINED);
for (KeyListener kl : bot.applet.getKeyListeners()) {
    kl.keyPressed(keyEvent);
}
```

Then, we’ll use reflection to load the interfaceCache from the RSInterface class and then index that to get the inventory interface. We’ll use that to access all of the fields identified in the “Finding Inventory Fields” section.

```java
// Load the client's inventory interface

Class<?> rsInterfaceClass = bot.loadClass("RSInterface");
Field interfaceCacheField = *getField*(rsInterfaceClass, "interfaceCache");
Object[] interfaceCache = (Object[])
interfaceCacheField.get(bot.applet);
Object invInterface = interfaceCache[3214];

// Get inventory contents
Field invField = getField(rsInterfaceClass, "inv");
int[] inv = (int[])invField.get(invInterface);

Field fInterfaceHeight = getField(rsInterfaceClass, "height");
Field fInterfaceWidth = getField(rsInterfaceClass, "width");
Field fInterfaceSpritePadX = getField(rsInterfaceClass, "invSpritePadX");
Field fInterfaceSpritePadY = getField(rsInterfaceClass, "invSpritePadY");
int interfaceStartX = 569; // int i2 = class9.childX\[l1\] + i;
int interfaceStartY = 213; // int j2 = class9.childY\[l1\] + l - j1;
int invWidth = (int)fInterfaceWidth.get(invInterface);
int invHeight = (int)fInterfaceHeight.get(invInterface);
int timeBetweenActions = 100;
```

Now we’ll trigger click events to drop each item in the inventory. We’ll loop over the rows and columns using the height and width fields of the inventory interface. We’ll use the inventory array to check if there is an item in the current slot. Then we’ll calculate the click location, offset from the top-left corner of the slot. Finally, we’ll trigger the drop by directly calling the mouseMoved, mousePressed, and mouseReleased methods reflectively on the game’s RSApplet class. The reason why a mouseMoved event has to be sent is that the interface has to be loaded, which only occurs when the mouse moves over the inventory.

```java
for (int r = 0; r < invHeight; r++) {
    for (int c = 0; c < invWidth; c++) {
        // If there is not an item in this slot, move on
        if (inv[r*invWidth + c] == 0) {
            continue;
        }

        // Calculate item sprite location
        int invX = interfaceStartX + c * (32 + (int)fInterfaceSpritePadX.get(invInterface));
        int invY = interfaceStartY + r * (32 + (int)fInterfaceSpritePadY.get(invInterface));

        // Click in the middle of the sprite
        int clickX = invX + 16;
        int clickY = invY + 16;

        // Generate mouse move event to the inventory
        MouseEvent mouseMoveEvent = new MouseEvent(bot.applet, MouseEvent.MOUSE_MOVED, 0, 0, clickX, clickY, 1, false);
        invokeMethod(bot.gameClass.getSuperclass(), "mouseMoved", new Class[]{MouseEvent.class}, bot.applet, new Object[]{mouseMoveEvent});
        Thread.sleep(timeBetweenActions);

        // Mouse pressed event
        MouseEvent mouseEvent = new MouseEvent(bot.applet, MouseEvent.MOUSE_CLICKED, 0, 0, clickX, clickY, 1, false);
        invokeMethod(bot.gameClass.getSuperclass(), "mousePressed", new Class[]{MouseEvent.class}, bot.applet, new Object[]{mouseEvent});
        Thread.sleep(timeBetweenActions);

        // Mouse released event
        MouseEvent mouseReleaseEvent = new MouseEvent(bot.applet, MouseEvent.MOUSE_RELEASED, 0, 0, clickX, clickY, 1, false);
        invokeMethod(bot.applet.getClass().getSuperclass(), "mouseReleased", new Class[]{MouseEvent.class}, bot.applet, new Object[]{mouseReleaseEvent});
        Thread.sleep(timeBetweenActions);
    }
}
```

Finally, we’ll release the shift key.

```java
// Release shift
keyEvent = new KeyEvent(bot.applet, 0, 0, 0, KeyEvent.VK_SHIFT, KeyEvent.CHAR_UNDEFINED);
for (KeyListener kl : bot.applet.getKeyListeners()) {
    kl.keyReleased(keyEvent);
}
```

## Demonstration

![](/img/CreatingABotFromScratch/image6.gif)

## Further Work

This “inventory dropper” was originally part of a larger mining bot that would mine a given ore until the character’s inventory was full, drop all of the items, and then start again. I decided to tighten the scope of this project to complete it in a more reasonable period of time. Extending this solution to perform mining would require being able to find the desired ore objects in the scene. The reverse engineering to find these ores has not been completed yet, and appears to be considerably more complex than just finding the inventory data due to the obfuscation, coupling, and complexity of the client. As such, it would be a worthwhile extension to this project, and would contribute greatly to public resources on creating bots from scratch.