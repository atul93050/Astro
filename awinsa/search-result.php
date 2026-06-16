<?php include 'header.php'; ?>

<style>
    .search_result{
        -webkit-box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
    padding: 25px;
   
    border-radius: 6px !important;
    }
    .search_result h6 
    {
        font-size: 28px;
        font-weight: 500;
    }
    .mb
    {
        margin-bottom: 40px;
    }
    .down-section 
    {
        padding-top: 60px;
    }

    /* RESPONSIVE CSS STARTS  */
    @media screen and (max-width:575px)
    {
        .down-section .search_result
        {
            margin: 0px 25px;
        }
        .search_result h6 {
    font-size: 24px;
}
    }
    /* RESPONSIVE CSS ENDS  */
</style>


<section class="inner-banner" style="background-image: url('assets/images/Case-Processing.jpg');">
  <div class="container">
      <div class="row">
          <div class="inner-banner-text">
              <h1>SEARCH RESULT</h1>
          </div>
      </div>
  </div>    
</section>

<section class="down-section ">
    <div class="container">
        <div class="row">

            <div class="col-12 px-0 mb">
                <div class="search_result   h-100">
                    <h6 class=""> <a href="#" > IT Managed Services </a></h6>
                    We provide innovative services to help clients build and support highly optimized and reliable IT infrastructures. With deep skills and knowledge, including industry-leading expertise, LDS focuses on understanding its client’s business goals an...
                    <a href="#" class="btn btn-light btn-rounded btn-very-small"> Read More </a>
                </div>
            </div>


            <div class="col-12 px-0 mb">
                <div class="search_result ps-30px pe-30px pt-30px pb-30px xl-ps-25px xl-pe-25px border-radius-6px hover-box overflow-hidden box-shadow-medium h-100">
                    <h6 class="mb-20px fw-500 "> <a href="#" class="text-dark-gray"> Backup &amp; Disaster Recovery </a></h6>
                    LDS delivers comprehensive Assured Recovery for virtual and physical environments with a next generation unified architecture and an easy to use console. This solution enables organizations to scale their IT environments easily while delivering again...
                    <a href="#" class="btn btn-light btn-rounded btn-very-small"> Read More </a>
                </div>
            </div>


            <div class="col-12 px-0 mb">
                <div class="search_result ps-30px pe-30px pt-30px pb-30px xl-ps-25px xl-pe-25px border-radius-6px hover-box overflow-hidden box-shadow-medium h-100">
                    <h6 class="mb-20px fw-500 "> <a href="#" class="text-dark-gray"> Enterprise Security </a></h6>
                    A strong Enterprise Information Security Architecture process helps to answer basic questions like:



                    Enterprise Information Security Architecture (EISA) is the practice of applying a comprehensive and rigorous method for describing a current or...
                    <a href="#" class="btn btn-light btn-rounded btn-very-small"> Read More </a>
                </div>
            </div>


            



        </div>
        
    </div>
</section>
<?php include 'footer.php'; ?>