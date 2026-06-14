


  function bookDemo() {
    const phoneNumber = '60147978236'; // WhatsApp number (in international format, no + or spaces)
    const message = encodeURIComponent('Hi! I would like to book a demo for AICelerate. Dear Weikee.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  }




document.addEventListener("DOMContentLoaded", () => {



//-------------------- Functions --------------------------------------------------------------

 // Hover effect for pricing buttons


  function setupHoverEffects() {

  const btnPrimary 		= document.querySelector(".btn-price-primary");
  const btnSecondaryList 	= document.querySelectorAll(".btn-price-secondary");

  btnSecondaryList.forEach((btnSecondary) => {

    btnSecondary.addEventListener("mouseenter", () => {
      btnSecondary.classList.add("hovered");
      btnPrimary.classList.add("swapped");
    });

    btnSecondary.addEventListener("mouseleave", () => {
      btnSecondary.classList.remove("hovered");
      btnPrimary.classList.remove("swapped");
      btnPrimary.classList.add("default");
    });

  });

  }





  // Active class switching
 const SnavItems = document.querySelectorAll('.nav-item');
    SnavItems.forEach(item => {

      item.addEventListener('click', () => {
        SnavItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
      });

    });


// Scrollspy functionality
window.addEventListener("scroll", () => {
  const sections = document.querySelectorAll("section");
  const navItems = document.querySelectorAll(".nav-item");

  let current = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 100; // offset for nav height
    const sectionHeight = section.offsetHeight;

    if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
      current = section.getAttribute("id");
    }
  });

  navItems.forEach((item) => {
    item.classList.remove("active");
    const href = item.getAttribute("href").substring(1); // remove #
    if (href === current) {
      item.classList.add("active");
    }
  });
});



//- - - - - - - - - - - - - - - D E S I G N  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 


//-------------------- Navigation --------------------------------------------------------------

 // Text content
  document.getElementById("brand-name").textContent = "AICelerate";
  document.getElementById("nav-overview").textContent = "Overview";
  document.getElementById("nav-features").textContent = "Features";
  document.getElementById("nav-pricing").textContent = "Pricing";
  document.getElementById("nav-contact").textContent = "Contact Us";

  // hrefs
  document.getElementById("brand-link").href = "#overview";
  document.getElementById("nav-overview").href = "#overview";
  document.getElementById("nav-features").href = "#features";
  document.getElementById("nav-pricing").href = "#pricing";
  document.getElementById("nav-contact").href = "#contact-us";





//-------------------- Overview --------------------------------------------------------------



  // Hero Heading and Description
  document.getElementById("hero-heading").innerHTML = 
    'AI-Powered University <span class="highlight">Timetable Scheduler</span>';
  
  document.getElementById("hero-description").textContent =
    "Automatically generate optimized timetables that balance lecturer availability, classroom resources, and student preferences with AI precision.";

  // Get Started Button
  document.getElementById("get-started-text").textContent = "Get Started";

  // Hero Video Source
  document.getElementById("video-source").src ="static/picture/demo.mp4";
  document.getElementById("hero-video").load(); // Reload video to apply source

  // Video Caption
  document.getElementById("video-caption-title").textContent = "Smart Timetable Generation";
  document.getElementById("video-caption-desc").textContent = "Optimized schedules in seconds";





//-------------------- Features --------------------------------------------------------------


  
 // Section 1 header
  document.getElementById("features-title").textContent = "Powerful Features";
  document.getElementById("features-description").textContent =
    "Streamline your academic scheduling process with our comprehensive suite of tools designed for universities";

  // Features data for first section
  const features1 = [
    {
      iconClass: "fa-solid fa-database",
      title: "Subject Management",
      description:
        "Upload, organize, and manage all your academic subjects with ease. Supports bulk import via CSV and JSON.",
      delay: 0.1,
    },
    {
      iconClass: "fa-solid fa-users",
      title: "Lecturer Assignment",
      description:
        "Assign lecturers to specific subjects based on availability, expertise, and workload preferences.",
      delay: 0.2,
    },
    {
      iconClass: "fa-solid fa-building",
      title: "Classroom Allocation",
      description:
        "Efficiently allocate classrooms based on capacity, facilities, and availability for each subject.",
      delay: 0.3,
    },
    {
      iconClass: "fa-solid fa-tags",
      title: "Smart Tagging System",
      description:
        "Categorize subjects and classrooms with custom tags for easy filtering and organization.",
      delay: 0.4,
    },
    {
      iconClass: "fa-solid fa-magic",
      title: "AI Optimization",
      description:
        "Advanced AI algorithms generate optimal timetables considering multiple constraints and preferences.",
      delay: 0.5,
    },
    {
      iconClass: "fa-solid fa-download",
      title: "Easy Export",
      description:
        "Download generated timetables in multiple formats including PDF, Excel, and CSV for easy distribution.",
      delay: 0.6,
    },
  ];

  // Features data for second section
  const features2 = [
    {
      iconClass: "fa-solid fa-face-smile-beam",
      title: "Flash Generation",
      description:
        "Create your complete timetable instantly with just one click — saving you time and effort.",
      delay: 0.7,
    },
    {
      iconClass: "fa-solid fa-table",
      title: "Friendly UI",
      description:
        "Effortlessly upload, organize, and manage all your academic subjects in one intuitive platform designed for simplicity and efficiency.",
      delay: 0.8,
    },
    {
      iconClass: "fa-solid fa-headset",
      title: "9/5 Supports",
      description:
        "Get reliable customer service whenever you need it, at the working hours.",
      delay: 0.9,
    },
  ];

  function createFeatureCard(feature) {
    const card = document.createElement("div");
    card.className = "card animate-slide-in";
    card.style.animationDelay = feature.delay + "s";

    const iconWrapper = document.createElement("div");
    iconWrapper.className = "icon-wrapper";

    const icon = document.createElement("i");
    icon.className = feature.iconClass;

    iconWrapper.appendChild(icon);

    const title = document.createElement("h3");
    title.textContent = feature.title;

    const desc = document.createElement("p");
    desc.textContent = feature.description;

    card.appendChild(iconWrapper);
    card.appendChild(title);
    card.appendChild(desc);

    return card;
  }

  // Append features 1
  const featuresGrid1 = document.getElementById("features-grid-1");
  features1.forEach((feature) => {
    featuresGrid1.appendChild(createFeatureCard(feature));
  });

  // Append features 2
  const featuresGrid2 = document.getElementById("features-grid-2");
  features2.forEach((feature) => {
    featuresGrid2.appendChild(createFeatureCard(feature));
  });








//-------------------- Pricing --------------------------------------------------------------



// Set header text for Pricing section
document.getElementById("pricing-title").textContent = "Simple, Transparent Pricing";
document.getElementById("pricing-description").textContent = "Choose the perfect plan for your institution's needs with no hidden fees";

// Pricing plans data

  const pricingPlans = [
    {
      title: "Monthly Plan (Yearly Premium)",
      priceLarge: "RM199",
      priceSuffix: "/month",
      description: "Flexible monthly payments, full premium perks. ",
      features: [
        { text: "Access all premium features instantly", available: true },
        { text: "Yearly Premium benefits included", available: true },
        { text: "Cancel anytime, no penalties", available: true },
        { text: "No hidden fees", available: true }
      ],
      buttonId: "btn-price-monthly",
      buttonClass: "btn-secondary btn-price-secondary", // <- secondary button class
      animationDelay: 0.1,
      popular: false
    },
    {
      title: "Yearly Plan (Yearly Premium)",
      priceLarge: "RM1999",
      priceSuffix: "/year",
      description: "Pay once a year, save big (17%).",
      features: [
        { text: "Save more vs. monthly payment", available: true },
        { text: "12 months of full premium access", available: true },
        { text: "Priority support", available: true },
        { text: "Exclusive updates", available: true }
      ],
      buttonId: "btn-price-yearly",
      buttonClass: "btn-primary btn-price-primary", // <- primary button class only here
      animationDelay: 0.2,
      popular: true
    },
    {
      title: "Freemium Plan",
      priceLarge: "FREE",
      priceSuffix: "",
      description: "Zero cost to try. Test first, decide later.",
      features: [
        { text: "10 free tokens upon signup", available: true },
        { text: "Upgrade anytime", available: true },
        { text: "Completely free to start", available: true },
        { text: "Perfect for new users to explore the platform", available: true },
      ],
      buttonId: "btn-price-freemium",
      buttonClass: "btn-secondary btn-price-secondary", // <- secondary button class
      animationDelay: 0.3,
      popular: false
    }
  ];

  const container = document.getElementById("pricing-cards");

  pricingPlans.forEach(plan => {
    // Create card container
    const card = document.createElement("div");
    card.className = "card animate-slide-in";
    if (plan.popular) card.classList.add("card-popular");
    card.style.animationDelay = plan.animationDelay + "s";

    // Inner padding div
    const innerDiv = document.createElement("div");
    innerDiv.className = "p-6";

    // Popular badge if applicable
    if (plan.popular) {
      const badge = document.createElement("div");
      badge.className = "popular-badge";
      badge.textContent = "POPULAR";
      innerDiv.appendChild(badge);
    }

    // Plan title
    const title = document.createElement("h3");
    title.className = "plan-title";
    title.textContent = plan.title;
    innerDiv.appendChild(title);

    // Price row
    const priceRow = document.createElement("div");
    priceRow.className = "price-row";

    const priceLarge = document.createElement("span");
    priceLarge.className = "price-large";
    priceLarge.textContent = plan.priceLarge;
    priceRow.appendChild(priceLarge);

    const priceSuffix = document.createElement("span");
    priceSuffix.className = "price-suffix";
    priceSuffix.textContent = plan.priceSuffix;
    priceRow.appendChild(priceSuffix);

    innerDiv.appendChild(priceRow);

    // Description
    const desc = document.createElement("p");
    desc.className = "plan-desc";
    desc.textContent = plan.description;
    innerDiv.appendChild(desc);

    // Features list
    const ul = document.createElement("ul");
    ul.className = "features-list mb-8";

    plan.features.forEach(feature => {
      const li = document.createElement("li");
      if (!feature.available) li.classList.add("disabled");

      const icon = document.createElement("i");
      icon.className = feature.available ? "fa-solid fa-check" : "fa-solid fa-times";
      li.appendChild(icon);

      const span = document.createElement("span");
      span.textContent = feature.text;
      li.appendChild(span);

      ul.appendChild(li);
    });

    innerDiv.appendChild(ul);

    // Button
    const button = document.createElement("button");
    button.id = plan.buttonId;
    button.className = `${plan.buttonClass} w-full`; // use only plan.buttonClass here
    button.textContent = "Choose Plan";

    innerDiv.appendChild(button);

    // Append inner div to card and card to container
    card.appendChild(innerDiv);
    container.appendChild(card);
  });

  // Run hover effect setup after buttons are created
  setupHoverEffects();



  
//-------------------- Contact-Us --------------------------------------------------------------
 // Text content
  const ctaTitle = "Ready to Transform Your Scheduling Process?";
  const ctaDesc =
    "Join hundreds of universities worldwide that have streamlined their academic scheduling with AICelerate";
  const signupNdemoText = "Sign Up & Book Demo Free";
  //const demoText = "Book Demo";

  // Inject into DOM
  document.querySelector(".cta-title").textContent = ctaTitle;
  document.querySelector(".cta-description").textContent = ctaDesc;
  document.querySelector(".signupNdemo-text").textContent = signupNdemoText;
  //document.querySelector(".demo-text").textContent = demoText;




//-------------------- Footer --------------------------------------------------------------


const footerData = {
    brand: "AICelerate",
    description: "AI-powered timetable scheduling solution for universities and educational institutions.",
    socialLinks: [
      { icon: "fa-facebook", href: "" },
      { icon: "fa-twitter", href: "" },
      { icon: "fa-linkedin", href: "" },
      { icon: "fa-instagram", href: "" },
    ],
    sections: {
      product: {
        title: "Product",
        links: [
          { text: "Features", href: "#features" },
          { text: "Pricing", href: "#pricing" },
          { text: "Demo", href: "#overview" },
          { text: "Integrations", href: "" },
          { text: "Updates", href: "" }
        ]
      },
      resources: {
        title: "Resources",
        links: [
          { text: "Documentation", href: "" },
          { text: "Tutorials", href: "" },
          { text: "Blog", href: "" },
          { text: "Support", href: "#contact-us" },
          { text: "FAQs", href: "" }
        ]
      },
      company: {
        title: "Company",
        links: [
          { text: "About Us", href: "#footer" },
          { text: "Contact", href: "#contact-us" },
          { text: "Careers", href: "" },
          { text: "Privacy Policy", href: "" },
          { text: "Terms of Service", href: "" }
        ]
      }
    },
    copy: `© ${new Date().getFullYear()} AICelerate. All rights reserved.`
  };

  // Brand and description
  document.querySelector(".footer-brand").textContent = footerData.brand;
  document.querySelector(".footer-description").textContent = footerData.description;

  // Socials
  const socialContainer = document.querySelector(".footer-socials");
  footerData.socialLinks.forEach(link => {
    const a = document.createElement("a");
    a.href = link.href;
    a.className = "footer-social-link";
    a.innerHTML = `<i class="fa-brands ${link.icon}"></i>`;
    socialContainer.appendChild(a);
  });

  // Sections
  Object.entries(footerData.sections).forEach(([key, section]) => {
    const container = document.querySelector(`.footer-links[data-section="${key}"]`);
    container.querySelector(".footer-title").textContent = section.title;

    const ul = container.querySelector(".footer-list");
    section.links.forEach(link => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = link.href;
      a.className = "footer-link";
      a.textContent = link.text;
      li.appendChild(a);
      ul.appendChild(li);
    });
  });

  // Copyright
  document.querySelector(".footer-copy").textContent = footerData.copy;












  });