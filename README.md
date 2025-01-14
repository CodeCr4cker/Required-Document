<div>
  <img align="right" width="40%" src="https://owlbertsio-resized.s3.amazonaws.com/Popper.psd.full.png">
</div>
<div id="header" align="center">
  <img src="https://media.giphy.com/media/M9gbBd9nbDrOTu1Mqx/giphy.gif" width="100"/>
</div>

<img src="https://media4.giphy.com/media/hvRJCLFzcasrR4ia7z/giphy.gif?cid=6c09b9522374v1dy9d4s7yqrb1v745bw7pr7i1kyqo3oben1&ep=v1_internal_gif_by_id&rid=giphy.gif&ct=s" height="20px" width="20px"> <B>Hello i am Divyanshu Pandey</B>


<a href="https://git.io/streak-stats"><img src="https://github-readme-streak-stats.herokuapp.com?user=Divyanshu-85&theme=dark&date_format=M%20j%5B%2C%20Y%5D&exclude_days=Sun%2CMon%2CTue%2CWed%2CThu%2CFri%2CSat&ring=EB0000" alt="GitHub Streak" /></a>




 <img src="https://github.com/Divyanshu-85/Required-Document/blob/main/Skills_Animation_Dark.gif">



















### Countdown Timer Code

```html
<!DOCTYPE HTML>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  p {
    text-align: center;
    font-size: 60px;
    margin-top: 0px;
  }
</style>
</head>
<body>

<p id="demo"></p>

<script>
// Set the date we're counting down to
var countDownDate = new Date("Jan 5, 2030 15:37:25").getTime();

// Update the count down every 1 second
var x = setInterval(function() {

  // Get the current date and time
  var now = new Date().getTime();
  
  // Find the distance between now and the count down date
  var distance = countDownDate - now;
  
  // Time calculations for days, hours, minutes, and seconds
  var days = Math.floor(distance / (1000 * 60 * 60 * 24));
  var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((distance % (1000 * 60)) / 1000);
  
  // Output the result in an element with id="demo"
  document.getElementById("demo").innerHTML = days + "d " + hours + "h "
  + minutes + "m " + seconds + "s ";
  
  // If the countdown is finished, write some text
  if (distance < 0) {
    clearInterval(x);
    document.getElementById("demo").innerHTML = "EXPIRED";
  }
}, 1000);
</script>

</body>
</html>
