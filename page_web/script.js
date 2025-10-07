var canvas = document.getElementById("structure");
  var context = canvas.getContext("2d");
   
   
  //Rectangle
  context.beginPath();
  context.fillStyle="blue";  
  context.lineWidth="10";  
  context.rect(500,50,600,515);
  context.fill();
  context.closePath();
   
  
  
   
  //Cercle
  context.beginPath();
  context.fillStyle = "white";
   
  
for(i=0;i<=5;i++)
{
 for(j=0;j<=6;j++)
  {
  context.arc(545+85*j,95+85*i,35,Math.PI*2,false); 
  context.fill();
  context.beginPath();
  }
  }