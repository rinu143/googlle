Mentalism Performer Portal – System Design README

Project Overview
This project is a web platform that allows a mentalist performer to instantly know what a spectator searches on a special link provided to them. Each performer receives a unique audience link and a private dashboard link. The system is managed by a single main admin who creates performer accounts and monitors usage.

The platform uses Firebase as the backend and React as the frontend. Email notifications are sent using Gmail SMTP when new performers are created.

Primary Flow

1. Admin creates a performer account
2. System sends welcome email containing:

   * username (email)
   * password
   * performer login page link
   * audience link
3. Performer logs into dashboard
4. Spectator opens performer audience link
5. Spectator searches a word
6. Spectator is redirected to real Google search results
7. Performer sees the searched word instantly on dashboard
8. Searches are stored in history until manually deleted

User Roles

Admin

* Unlimited device login
* Creates performer accounts
* Edits performer details
* Removes performers
* Views number of performers and their status

Performer

* Can login on maximum 2 devices at same time
* If logging into a third device, oldest session is logged out with warning
* Has a personal audience link
* Sees live search words
* Can view history with pagination
* Can manually delete history

Audience

* Uses performer’s unique link
* Searches a word in the search page the search page will be clone of [https://www.google-in.co/jet]
* Gets redirected to real Google search results
* Does not login

Unique Link System
Each performer receives a permanent slug link generated from their email.

Example: <br/>
domain.com/login (login page for every performer) <br/>
domain.com/dashboard (After login redirect to dashboard) <br/>
domain.com/jon (audience link for performer with email starting with "jon")

Slug generation rule:
First 3 letters of email + uniqueness check in database.

Two links exist per performer:
Audience link
Used by spectators to perform searches

Performer dashboard link
Used by performer to login and view searches

Device Limit Logic
Only performers are limited to 2 devices.

When performer logs in:
If active sessions < 2 → allow login
If active sessions = 2 → remove oldest session and allow login
A warning message appears on the removed device

Admin has no device restriction.

Search Handling
Audience enters search word on performer audience page.
System stores the word in Firebase.
Immediately redirects user to:
https://www.google.com/search?q=entered_word

Performer dashboard listens in realtime and displays:
Latest search
Search history
“Latest” indicator badge on newest search

History Management
Search history is stored per performer.
No automatic deletion.
Performer can manually clear history anytime.

Admin Dashboard Features
Admin panel shows:
Total number of performers
Performer email
Slug link
Active status
Last activity time

Admin controls:
Create performer
Edit performer email/password
Delete performer
Disable performer

Email System
When admin creates a performer:
System sends email using Gmail SMTP.

Email contains:
Welcome message
Login credentials
Performer dashboard link
Audience link

A delay of a few seconds is used between email sends to avoid Gmail rate limits.

Technology Stack

Frontend
React

Backend
Firebase Authentication
Firebase Firestore Database

Email
Gmail SMTP

Hosting
Vercel

Database Structure Concept

users collection
stores performer profile and role

sessions collection
stores active device sessions

searches collection
stores search history per performer

slugs collection
maps slug links to performer IDs

Security Rules Concept
Only admin can create or delete performers
Only performer can read their own searches
Audience can only write search word via slug mapping
No audience access to user list

Realtime Behaviour
Performer dashboard subscribes to searches collection.
New search instantly appears with “latest” label.
Older latest label moves down automatically.

System Purpose
This platform is intended for live entertainment mentalism performance demonstrations where a performer reveals what a spectator searched moments earlier.

Future Expansion Possibilities
Multiple admins
Analytics panel
Performance statistics
Temporary sessions mode
Scheduled automatic cleanup option
