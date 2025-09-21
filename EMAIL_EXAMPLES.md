# Confirmation Email Cloud Function

## Overview

The `sendConfirmationEmail` cloud function sends beautiful, modern confirmation emails that match your website's aesthetic. The emails feature:

- **Modern Design**: Uses your website's color scheme (Gold #EEB541 and Blue #557CBA)
- **Responsive Layout**: Works perfectly on desktop and mobile devices
- **Professional Branding**: Includes your logo and branding elements
- **Rich Content**: Registration details, participant info, event details, and packing lists
- **Multiple Types**: Supports registration, payment, and reminder emails

## Usage Examples

### Basic Registration Confirmation

```javascript
// Call from your frontend or another cloud function
const result = await functions().httpsCallable('sendConfirmationEmail')({
  recipientEmail: 'parent@example.com',
  recipientName: 'Ahmad Johnson',
  registrationId: 'REG_1234567890_ABC123',
  children: [
    {
      name: 'Sara Johnson',
      age: 14,
      grade: '9th',
      gender: 'Female',
      dietary: 'No peanuts',
      medical: 'Asthma - has inhaler'
    },
    {
      name: 'Omar Johnson', 
      age: 12,
      grade: '7th',
      gender: 'Male'
    }
  ],
  total: 550,
  type: 'registration'
});
```

### Payment Confirmation

```javascript
const result = await functions().httpsCallable('sendConfirmationEmail')({
  recipientEmail: 'parent@example.com',
  recipientName: 'Fatima Ali',
  registrationId: 'REG_1234567890_DEF456',
  children: [
    {
      name: 'Yusuf Ali',
      age: 13,
      grade: '8th', 
      gender: 'Male'
    }
  ],
  total: 275,
  type: 'payment'
});
```

### Event Reminder (Simple)

```javascript
const result = await functions().httpsCallable('sendConfirmationEmail')({
  recipientEmail: 'parent@example.com',
  recipientName: 'Khadija Smith',
  type: 'reminder'
});
```

### Custom Event Details

```javascript
const result = await functions().httpsCallable('sendConfirmationEmail')({
  recipientEmail: 'parent@example.com',
  recipientName: 'Ibrahim Hassan',
  registrationId: 'REG_1234567890_GHI789',
  eventDate: 'Friday Dec 05, 2025, 4:00 PM – Sunday Dec 07, 2025, 4:00 PM',
  location: 'Florida Elks Youth Camp, 24175 SE Hwy 450, Umatilla, FL 32784, USA',
  children: [
    {
      name: 'Aisha Hassan',
      age: 15,
      grade: '10th',
      gender: 'Female',
      dietary: 'Vegetarian',
      medical: 'None'
    }
  ],
  total: 275,
  type: 'registration'
});
```

## Parameters

### Required Parameters
- `recipientEmail` (string): Email address to send to
- `recipientName` (string): Name of the recipient

### Optional Parameters
- `registrationId` (string): Registration ID to display
- `children` (array): Array of participant objects with:
  - `name` (string): Participant name
  - `age` (number): Participant age
  - `grade` (string): School grade
  - `gender` (string): Gender
  - `dietary` (string, optional): Dietary restrictions
  - `medical` (string, optional): Medical information
- `total` (number): Total amount paid/due
- `eventDate` (string): Event date and time (defaults to retreat dates)
- `location` (string): Event location (defaults to camp location)
- `type` (string): Email type - 'registration', 'payment', or 'reminder' (defaults to 'registration')

## Integration Status ✅

**The confirmation email system is now fully integrated into your frontend registration flow!**

### Frontend Email Integration

Emails are now sent directly from the frontend for better control:

1. **Registration Confirmation**: Called after `saveRegistration` succeeds
2. **Payment Confirmation**: Called after `confirmPayment` succeeds

### Integration Points

The system is integrated in your frontend registration flow (`src/pages/Register.jsx`):

- **After Registration**: Calls `sendConfirmationEmail` with type 'registration'
- **After Payment**: Calls `sendConfirmationEmail` with type 'payment'

### Benefits of Frontend Integration

- **No Duplicate Emails**: Single email per event
- **Better Error Handling**: Frontend can retry or show user feedback
- **More Control**: Frontend decides when and what emails to send
- **Debugging**: Console logs show email status in browser

### Error Handling

- Email failures **do not** affect registration or payment success
- Email errors are logged to browser console
- Users still get successful registration/payment responses even if email fails
- This ensures robust operation even if email service is temporarily unavailable

## Email Features

The emails include:

1. **Header**: Beautiful gradient header with retreat branding
2. **Welcome Message**: Personalized greeting with Islamic salutation
3. **Registration Details**: ID and payment information
4. **Participant Information**: Detailed participant cards with all info
5. **Event Details**: Date, time, and location in styled cards
6. **Packing List**: Essential items to bring
7. **Important Reminders**: Key dates and requirements
8. **Contact Information**: How to reach organizers
9. **Professional Footer**: Branding and copyright

## Error Handling

The function includes comprehensive error handling:

- Email validation errors
- Rate limiting
- Service unavailability
- Detailed logging for debugging

## Domain Configuration

Make sure your Resend API is configured with your domain (`muslimyouthretreat.org`) for the best deliverability.

