import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './HomePage.css'

const HomePage = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    // Set target date to December 5th, 2025 (you can update this)
    const targetDate = new Date('2025-12-05T16:30:00')
    
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const difference = targetDate.getTime() - now
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="homepage">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-text">
              <span className="logo-main">MYR</span>
              <span className="logo-sub">2025</span>
            </div>
          </div>
          <ul className="nav-menu">
            <li><a href="#home">Home</a></li>
            <li><a href="#overview">Overview</a></li>
            <li><a href="#schedule">Schedule</a></li>
            <li><a href="#facilitators">Facilitators</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <div className="nav-register">
            <Link to="/register" className="nav-register-btn">Register Now</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-background">
          <img src="/cabin-background.jpg" alt="Youth Camp Cabins" />
          <div className="hero-overlay">
            <div className="hero-content">
              <div className="countdown-badge">
                {timeLeft.days} DAYS TO THE EVENT
              </div>
              <h1 className="hero-title">Muslim Youth Retreat 2025</h1>
              
              <div className="event-details">
                <div className="event-when">
                  <h3>When</h3>
                  <p>Friday, Dec 05, 2025, 4:30 PM – Sunday, Dec 07, 2025, 4:30 PM</p>
                </div>
                
                <div className="event-where">
                  <h3>Where</h3>
                  <p>
                    <a 
                      href="https://maps.google.com/?q=Florida+Elks+Youth+Camp,+24175+SE+Hwy+450,+Umatilla,+FL+32784,+USA" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{color: 'inherit', textDecoration: 'underline'}}
                    >
                      Florida Elks Youth Camp,<br />
                      24175 SE Hwy 450, Umatilla, FL 32784, USA
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="hero-buttons">
                <Link to="/register" className="register-btn">Register Now</Link>
                <div className="pricing-info">
                  <span className="price">Price: $275 Per Participant</span>
                  <span className="deadline">Registration Deadline: November 17th, 2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Section */}
      <section id="overview" className="leadership-section">
        <div className="container">
          <h2>An Epic Weekend Awaits</h2>
          <div className="leadership-content">
            <p>
              MYR in partnership with Wise Academy is pleased to present the 3rd bi-annual 
              leadership opportunity for Muslim Boys and Girls in grades 6 to 12, to increase 
              their leadership capacity and skills over an epic weekend experience.
            </p>
            <p>
              A retreat catered for young Muslims to help them understand their identity, be 
              confident in who they are, and build lasting bonds with like-minded individuals; 
              all while having a blast!
            </p>
          </div>
        </div>
      </section>

      {/* Price Includes Section */}
      <section className="price-section">
        <div className="container">
          <div className="price-card">
            <h3>Price Includes:</h3>
            <ul>
              <li>2 nights accommodation at a secured indoor facility that will be chaperoned by adults at a rate of more than 1 adult for every 10 participants.</li>
              <li>6 meals</li>
              <li>5 high-quality outdoor leadership activities run by professional teachers and trained staff from Florida Elks Youth Camp, as well as motivational talks and facilitation on leadership for Muslims, run by a professional leadership coach.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="target-section">
        <div className="container">
          <div className="target-card">
            <h3>This program is for teenagers who:</h3>
            <ul>
              <li>Are interested in excelling in life as leaders in the making</li>
              <li>Want to have an enjoyable experience with friends, doing fun outdoor activities</li>
              <li>Want to increase their self confidence in an encouraging, positive environment</li>
              <li>Are interested in increasing their inner capacity to be comfortable as themselves and having the confidence to act according to what they know is right</li>
              <li>Want to learn and adopt some of the most effective habits of successful people</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Outcomes Section */}
      <section className="outcomes-section">
        <div className="container">
          <div className="outcomes-card">
            <h3>Participants will come out of the program with:</h3>
            <ul>
              <li>Increased self-esteem and confidence in order to be who they are meant to be</li>
              <li>Improved interpersonal communication and people skills</li>
              <li>Consciousness of how great leaders think and act</li>
              <li>A deeper connection to nature with increased wilderness survival skills</li>
              <li>Great friendships and bonds with others who will be allies for years to come</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Why Important Section */}
      <section className="importance-section">
        <div className="container">
          <div className="importance-card">
            <h3>Why is this important?</h3>
            <p>
              Working with youth has shown time and again that the youth face the great challenge of a fear of 
              <strong> REJECTION</strong> everyday. It is as if the cause of all other fears: Failure, Being Left Behind, Judgement, 
              Loss of Health, Loss of Funds are all rooted in the <strong>FEAR OF REJECTION</strong>. This is why being around 
              the right kinds of people is extremely important.
            </p>
            <p>
              <strong>STRENGTH OF CHARACTER</strong> and <strong>IDENTITY</strong> make the difference between making the right or wrong 
              choices in early life.
            </p>
            <p>
              By enrolling, you are improving the chances for increased positivity and movement in the right 
              direction, especially during these challenging technological times.
            </p>
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section id="schedule" className="schedule-section">
        <div className="container">
          <h2>Schedule</h2>
          
          <div className="schedule-day friday">
            <h3>FRIDAY, DECEMBER 5TH</h3>
            <ul>
              <li>4:30 pm - Arrival</li>
              <li>5:30 pm - Welcoming Campers, Maghrib Prayers & Qur'an Reflection</li>
              <li>6:15 pm - Cabin Assignments and Meet & Greet</li>
              <li>7:30 pm - Dinner</li>
              <li>8:15 pm - Interactive Session 1: Facilitator Introduction</li>
              <li>10:00 pm - Gym Free Time</li>
              <li>11:00 pm - Lights Out</li>
            </ul>
          </div>

          <div className="schedule-day saturday">
            <h3>SATURDAY, DECEMBER 6TH</h3>
            <ul>
              <li>6:00 am - Wake-up and Adhan</li>
              <li>6:15 am - Fajr Prayers, Qur'an Reflection, and Meditation</li>
              <li>6:45 am - Prepare for the day</li>
              <li>7:15 am - Breakfast</li>
              <li>8:30 am - Interactive Session 2: Archery and Canoeing</li>
              <li>12:30 pm - Dhuhr Prayers & Qur'an Reflection</li>
              <li>1:00 pm - Lunch</li>
              <li>1:30 pm - Ropes Course, Interactive Session 3</li>
              <li>5:30 pm - Maghrib Prayers Setup</li>
              <li>5:45 pm - Maghrib Prayers & Qur'an Reflection</li>
              <li>6:15 pm - Dinner</li>
              <li>7:00 pm - Campfire</li>
              <li>8:15 pm - Girls Only Campfire</li>
              <li>8:45 pm - Basketball Tournament</li>
              <li>10:00 pm - Free Time</li>
              <li>11:00 pm - Lights Out</li>
            </ul>
          </div>

          <div className="schedule-day sunday">
            <h3>SUNDAY, DECEMBER 7TH</h3>
            <ul>
              <li>6:00 am - Wake-up and Adhan</li>
              <li>6:15 am - Fajr Prayers, Qur'an Reflection and Meditation</li>
              <li>6:45 am - Prepare for the day</li>
              <li>7:15 am - Breakfast</li>
              <li>8:30 am - Interactive Session 4: Canoeing, Gym and Open Fields</li>
              <li>12:30 pm - Dhuhr Prayers & Qur'an Reflection</li>
              <li>1:15 pm - Lunch</li>
              <li>2:15 pm - Cabin Cleanup</li>
              <li>3:00 pm - Closing Circle: What Are You Taking With You? What Are You Leaving Behind?</li>
              <li>4:30 pm - Departure</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Facilitators Section */}
      <section id="facilitators" className="facilitators-section">
        <div className="container">
          <h2>Facilitators</h2>
          <div className="facilitators-grid">
            <div className="facilitator">
              <img src="/shabbir-kirmani.png" alt="Shabbir Kirmani" />
              <h4>Shabbir Kirmani</h4>
            </div>
            <div className="facilitator">
              <img src="/hussein-charara.png" alt="Hussein Charara" />
              <h4>Hussein Charara</h4>
            </div>
            <div className="facilitator">
              <img src="/mohammed-taher.png" alt="Mohammed Taher" />
              <h4>Mohammed Taher</h4>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="container">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h4>What is the registration deadline?</h4>
              <p><em>November 17th, 2025. All payments must be received by this date as we need to provide a full headcount for accommodations and catering.</em></p>
            </div>
            
            <div className="faq-item">
              <h4>How will accommodations be arranged?</h4>
              <p><em>There are separate cabins for boys and girls. Each cabin can accommodate up to 9 people (1 chaperone and 8 kids) with heat/AC, hot water, and a private bathroom.</em></p>
            </div>
            
            <div className="faq-item">
              <h4>Can we bring our own tent and sleep outside?</h4>
              <p><em>No, all accommodations will be arranged in advance and everyone must sleep in a cabin.</em></p>
            </div>
            
            <div className="faq-item">
              <h4>Will transportation be provided?</h4>
              <p><em>Everyone is responsible for arranging their own transportation.</em></p>
            </div>
            
            <div className="faq-item">
              <h4>What is the proper dress code for camp?</h4>
              <p><em>Boys are allowed to wear shorts below knee length, and short/long sleeve shirts (no tank-tops). Girls are allowed to wear comfortable long sleeve clothing and hijab will need to be observed at all times.</em></p>
            </div>
            
            <div className="faq-item">
              <h4>Can I still attend camp if I am from out of town?</h4>
              <p><em>Yes! In order to register for the camp, if you're out of town, you are required to contact one of the organizers first. We also require written parental consent. Please be mindful at times when setting up transport to and from the airport if you are traveling by plane.</em></p>
            </div>
            
            <div className="faq-item">
              <h4>Are spots limited?</h4>
              <p><em>Yes! Unfortunately spots are limited, regardless if you are from in-town or out of town, spots will fill up quickly. Remember your registration is NOT completed until payment is RECEIVED or you have spoken to an organizer about payment sponsorship.</em></p>
            </div>
            
            <div className="faq-item">
              <h4>Who will watch over my kid(s)?</h4>
              <p><em>We have hand selected chaperones that will ensure your kids have a safe, fun, and fully educational experience. (Chaperones will be announced after registration is completed, along with their contact information).</em></p>
            </div>
            
            <div className="faq-item">
              <h4>What if I'm unable to pay the full fee?</h4>
              <p><em>Please contact one of the organizers and they will handle your request in confidence.</em></p>
            </div>
            
            <div className="faq-item">
              <h4>How can I help as a sponsor?</h4>
              <p><em>If you would like to help a child have an opportunity to attend camp please contact one of the organizers below and your sponsorship will be handled in full confidence. To protect the privacy of the child you will not be notified which child you have helped. However rest assured your sponsorship will guarantee a child's placement for camp or it will go towards the payment of essential fees (transportation, food, activities,...etc.)</em></p>
            </div>
            
            <div className="faq-item">
              <h4>Will I be able to contact my kid(s) at camp?</h4>
              <p><em>Yes! There will be reception on camp grounds. You will also have the contact information of all organizers and chaperones after registration is completed.</em></p>
            </div>
            
            <div className="faq-item">
              <h4>What should I bring with me to the camp?</h4>
              <p><em>We recommend all participants come prepared and bring the following for your own comfort and convenience:</em></p>
              <ul>
                <li>1 Quran</li>
                <li>1 light blanket w/2 sheets or a sleeping bag</li>
                <li>Pillow and pillowcase</li>
                <li>1-2 pairs of pajamas</li>
                <li>1-2 towels</li>
                <li>Reusable Water Bottle</li>
                <li>Underwear</li>
                <li>Socks</li>
                <li>Sneakers</li>
                <li>Baseball cap or hat</li>
                <li>Namaaz chadar (girls must bring their own)</li>
                <li>Toothbrush/toothpaste</li>
                <li>Comb and/or brush</li>
                <li>Bar soap/shampoo</li>
                <li>Wash items container (anything to hold soap, comb, etc.)</li>
                <li>1 flashlight w/batteries or portable lantern</li>
                <li>Sunscreen</li>
                <li>Insect repellent</li>
                <li>Raincoat or Poncho</li>
                <li>Board game (optional)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="partnership-section">
        <div className="container">
          <h2>In Partnership With</h2>
          <div className="partner-logo">
            <img src="/wise-academy-logo.png" alt="Wise Academy Logo" />
          </div>
        </div>
      </section>

      {/* Directions Section */}
      <section className="directions-section">
        <div className="container">
          <h2>Directions</h2>
          <div className="map-container">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3478.123456789!2d-81.123456789!3d28.123456789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sFlorida%20Elks%20Youth%20Camp!5e0!3m2!1sen!2sus!4v1234567890"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Florida Elks Youth Camp Location"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <h2>Contact Information</h2>
          <p>For additional information, please reach out to:</p>
          <div className="contact-info">
            <p><strong>Kamran Datoo - 407-408-1048</strong></p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage