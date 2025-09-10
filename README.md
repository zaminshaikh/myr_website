# Muslim Youth Retreat Website

A React.js website for the Muslim Youth Retreat 2025, featuring a comprehensive registration system with dynamic pricing.

## Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Hero Section**: Eye-catching landing with countdown timer and event details
- **Smooth Navigation**: Auto-scrolling navigation to different sections
- **Comprehensive Information**: All sections from the original Wix design including:
  - Leadership in Action description
  - Pricing information
  - Target audience details
  - Program outcomes
  - Detailed schedule for all three days
  - Facilitator profiles
  - Comprehensive FAQ section
  - Partnership information
  - Directions with map
  - Contact information

- **Multi-Step Registration**: 4-step registration process including:
  - Parent/Guardian information
  - Participant details (supports multiple children)
  - Agreements and waivers
  - Payment processing (demo implementation)

- **Dynamic Pricing**: 
  - $275 for single participant
  - $250 per participant for multiple registrations

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the port shown in terminal)

## Project Structure

```
src/
├── pages/
│   ├── HomePage.jsx      # Main landing page with all sections
│   ├── HomePage.css      # Styles for home page
│   ├── Register.jsx      # Multi-step registration form
│   └── Register.css      # Styles for registration form
├── App.jsx              # Main app component with routing
├── App.css              # Global app styles
├── index.css            # Global CSS reset and base styles
└── main.jsx             # App entry point
```

## Customization

### Replace Placeholder Images
All images currently use placeholder URLs (`/api/placeholder/...`). Replace these with actual images:
- Logo in navigation
- Hero background image
- Facilitator photos
- Wise Academy logo

### Enable Stripe Integration
To enable real payment processing:

1. Install Stripe packages:
   ```bash
   npm install @stripe/stripe-js @stripe/react-stripe-js
   ```

2. Update `Register.jsx` to use actual Stripe implementation
3. Replace the demo Stripe key with your publishable key
4. Set up a backend server to handle payment processing

### Update Event Information
- Modify dates in `HomePage.jsx`
- Update countdown timer target date
- Change pricing if needed
- Update contact information
- Replace Google Maps embed with actual location

## Technologies Used

- React 18
- React Router DOM
- CSS3 with Flexbox and Grid
- Responsive design principles

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is created for the Muslim Youth Retreat organization.