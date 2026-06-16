<?php include 'header.php';?>

  <section class="error404">
  <div class="container">
     <div class="row">
      <div class="col-lg-12 col-md-12 col-sm-12 col-12">
        <div class="th-head">
         <div class="th-img">
           <img src="assets/images/404-a.svg">
         </div>
         <div class="th-text-1">
           <h2>This Page Doesn't Exist</h2>
           <p>Sorry, but the page you are looking for could not be found</p>
         </div>
         <div class="button-text">
          <a href="https://extranet.tangence.com/awinsa/"> BACK</a>
         </div>
     </div>
  </div>
</div>
</div>
</section>


<?php include 'footer.php';?>



<style>
  .error404
  {
    background-color: #283562;
  }
  .th-head
  {
    display: flex;
    justify-content: center;
    justify-items: center;
    flex-direction: column;
    height: 120vh;
    align-items: center;
  }
  .th-img img
  {
    width: 80%;
  }
  .th-img
  {
    text-align: center;
  }
  .th-text-1
  {
    text-align: center;
  }
  .th-text-1 p
  {
    font-size: 20px;
    color: #ffffff;
    
  }
.th-text-1 h2
{
  margin-top: 30px;
    font-weight: 500;
    font-size: 70px;
    color: #ffffff;
}
.button-text
{
  background: #ffffff;
  border-radius: 50px;
  text-align: center;
  width: 150px;
  padding: 10px;
  margin-top: 10px;
}
.button-text a
{
  text-decoration: none;
  color:#000;
  font-weight: bold;
  font-size: 15px;
}


  

@media screen and (max-width: 1024px){

.th-text-1 p br
  {
    display: none;
  }
  .th-text-1 h3
  {
    font-size: 45px;
  }
   .th-text-1 p
  {
    font-size: 26px;
    line-height: 38px;
  }
  .th-text-1 h2 {
    font-size: 50px;
}
.th-head {
    height: 70vh;
}
.th-img img
  {
    width: 100%;
  }

}

@media screen and (max-width: 992px) {

  .th-text-1 p br
  {
    display: none;
  }
  .th-text-1 h3
  {
    font-size: 37px;
  }
  .th-text-1 h2 {
    font-size: 45px;
}
  .th-text-1 p {
    font-size: 19px!important;
}
.th-head {
    height: 60vh;
}
.th-img img
  {
    width: 100%;
  }
}

@media screen and (max-width: 767px) 
{
.th-text-1 h2 {
    font-size: 28px;
    margin-top: 20px;
}
.th-text-1 p br
{
  display: none;
}
.th-text-1 h3
{
  font-size: 20px;
}
.th-text-1 p
  {
    font-size: 19px!important;
    line-height: 24px;
  }
  .th-head {
        height: 100%;
        padding: 50px 0;
        padding-top: 80px;
    }
.th-img img
  {
    width: 80%;
  }
  .th-img
  {
    text-align: center;
  }
}
</style>

