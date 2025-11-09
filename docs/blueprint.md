# **App Name**: Tonal Tracker

## Core Features:

- User Authentication: Secure user sign-up, login, and logout using Firebase Authentication with email/password and Google sign-in.
- Exercise Database: A pre-populated, read-only collection in Firestore containing a master list of Tonal exercises.
- Custom Workout Builder: Authenticated users can create, save, and edit custom workout routines by selecting exercises from the master database, specifying sets and rep goals, saved to Firestore.
- Workout Logger: Allows users to select a custom workout and log sets, reps and weights, saving session data to Firestore.
- Workout History: A page displaying a history of completed workout logs, sorted by date, pulled from Firestore.
- Progress Tracker: Dashboard to view progress over time for specific exercises based on workout logs stored in Firestore.

## Style Guidelines:

- Primary color: Deep blue (#293B62), reflecting the strength and reliability of workout tracking.
- Background color: Light gray (#E7E8EA), providing a neutral backdrop that keeps the focus on the data.
- Accent color: Muted teal (#457B9D), used sparingly to highlight interactive elements and key stats.
- Body and headline font: 'Inter' for a modern, machined and objective feel. 'Inter' is sans-serif.
- Use minimalist icons representing exercises and workout metrics.
- Clean, data-focused layouts emphasizing clarity and ease of use.
- Subtle animations for feedback and transitions to enhance the user experience.