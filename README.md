# Youtube Karaoke
Attenuate vocal on youtube MVs

# How it looks on your Youtube Player
![how it look](lookonyoutube.png)

# SETUP
* Download TamperMonkey for [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) or your default browser
* Open dashboard and add a new script
    * ![set up script](setupscript.png)
* Copy https://raw.githubusercontent.com/heyqule/youtubekaraoke/master/karaoke.js to your new script, save it and enable it
* Find a mv on youtube and test it out
   * If you don't see the mic icon, try fresh the tab.
* Accept microphone permission notification
    * There is a noticeable delay when connecting the mic via browser.
    * The ideal way is to connect the mic with a zero latency audio interface    
* ???
* Profit

#Features
- Support center cut
- Support left or right cut from 90s KTV videos
    - https://www.youtube.com/watch?v=Hm1cQlvBTz0  (set to right channel attenuation)
- Support mic gain if mic is connect via browser    
- Support per song setting save as localstorage
    
#Experimental Features (requires API key)
------------
* Save setting to Cloud
* Automatically load your setting from Cloud
* Search other tracks from Cloud, instead of youtube
 
#Limitations
Not all songs are compatible with this plugin.

Orignally MVs usually work the best 
<br /> https://youtu.be/LWV-f6dMN3Q?t=60

It's not able to cut certain part of the vocal due to the way it mixed.
<br /> https://www.youtube.com/watch?v=zhGnuWwpNxI

The result from concerts MVs are usually not as good.
<br /> https://www.youtube.com/watch?v=rZKQmjTtVK8 

# Credits
Center attenuation functions made by Richard Stanton 
<br /> https://github.com/stanton119/YouTube-Karaoke

