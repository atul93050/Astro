<?php include 'header.php';?>

    <section class="thnk">
  <div class="container">
     <div class="row">
      <div class="col-lg-12 col-md-12 col-sm-12 col-12">
        <div class="th-head-a">
         <div class="th-img-a">
           <img src="assets/images/Thank_You-a.svg">
         </div>
         <div class="th-text-1-a">
           <h2>Thank You For Contacting Us!</h2>
           <p>We have received your message We'll reach you out seriously!</p>
         </div>
         <div class="button-text-a">
          <a href="https://extranet.tangence.com/awinsa/"> BACK</a>
         </div>
     </div>
  </div>
</div>
</div>
</section>


<?php include 'footer.php';?>


<style>
    .thnk
    {
        background-color: #283562;
    }
    .th-head-a
  {
    display: flex;
    justify-content: center;
    justify-items: center;
    flex-direction: column;
    height: 120vh;
    align-items: center;
  }
  .th-img-a img
  {
    width: 100%;
    width: 250px
  }
  .th-text-1-a
  {
    text-align: center;
  }
  .th-text-1-a h2
  {
    font-size: 50px;
    margin-top: 40px;
    color: #ffffff;
  }
  .th-text-1-a p
  {
    color: #ffffff;
  }
.button-text-a
{
  background: #ffffff;
  border-radius: 50px;
  text-align: center;
  width: 150px;
  padding: 10px;
  margin-top: 10px;
}
.button-text-a a
{
  text-decoration: none;
  color:#000000;
  font-weight: bold;
  font-size: 15px;
}

  

@media screen and (max-width: 1024px){

.th-text-1-a p br
  {
    display: none;
  }
   .th-text-1-a p
  {
    font-size: 32px;
    line-height: 38px;
  }
  .th-head-a {
    height: 60vh;   
}
}
@media screen and (max-width: 992px) {

  .th-text-1-a p br
  {
    display: none;
  }
  .th-text-1-a p
  {
    font-size: 22px;
  }
  .th-head-a {
    height: 60vh;   
}
.th-text-1-a h2 {
    font-size: 38px;
    margin-top: 40px;
    font-weight: 600;
}
}

@media screen and (max-width: 767px) 
{
  .th-img-a img {
    max-width: 170px;
}
.th-text-1-a h2 {
    font-size: 18px;
    margin-top: 20px;
    font-weight: 600;
}
.th-text-1-a p br
{
  display: none;
}
.th-text-1-a p
{
  font-size: 17px;
  line-height: 21px;
}
.th-head-a {
        height: 100%;
        padding: 50px 0;
        padding-top: 80px;
    }
.button-text-a {
    background: #ffffff;
    border-radius: 50px;
    text-align: center;
    width: 120px;
    padding: 8px;
    margin-top: 10px;
}
}
    </style>