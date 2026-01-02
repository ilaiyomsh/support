# Support App - מערכת תמיכה עם הקלטת מסך ל-Monday.com

מערכת תמיכה המאפשרת ללקוחות קצה לפתוח פניות עם הקלטת מסך, כאשר הפניות נשמרות אוטומטית בלוח Monday של המטמיע.

## 📋 תוכן עניינים

- [תכונות](#תכונות)
- [דרישות מערכת](#דרישות-מערכת)
- [התקנה](#התקנה)
- [הגדרה](#הגדרה)
- [הרצה](#הרצה)
- [בנייה ופריסה](#בנייה-ופריסה)
- [מבנה הפרויקט](#מבנה-הפרויקט)
- [תיעוד נוסף](#תיעוד-נוסף)

## ✨ תכונות

- **הקלטת מסך** - לקוחות יכולים להקליט את המסך שלהם עם הסבר קולי
- **ניהול לינקים** - מטמיעים יכולים ליצור ולנהל לינקים ייחודיים ללוחות שלהם
- **מיפוי עמודות** - התאמה גמישה של עמודות בלוח Monday
- **Multi-Tenant** - תמיכה במספר מטמיעים במקביל
- **אבטחה** - הפרדה מלאה בין חשבונות עם OAuth 2.0

## 🔧 דרישות מערכת

- Node.js 18+ 
- npm או yarn
- חשבון Monday.com עם גישה ל-Developer Center
- Monday Apps CLI (`@mondaycom/apps-cli`)

## 📦 התקנה

```bash
# שכפל את הפרויקט
git clone <repository-url>
cd support

# התקן תלויות
npm install
```

## ⚙️ הגדרה

### 1. יצירת קובץ `.env`

צור קובץ `.env` בשורש הפרויקט:

```bash
cp .env.example .env  # אם יש קובץ דוגמה
# או צור ידנית
touch .env
```

### 2. הגדרת משתני סביבה

פתח את הקובץ `.env` והגדר את המשתנים הבאים:

```bash
# Monday API Token - קבל מ-Monday Developer Center
MOCK_MONDAY_TOKEN=your-monday-api-token-here

# Mock Access Token for Storage Service (MVP)
MOCK_ACCESS_TOKEN=mock-token-for-dev

# Port for local development
PORT=8301

# OAuth Configuration (לעתיד - Spiral 3)
# MONDAY_CLIENT_ID=your-client-id
# MONDAY_CLIENT_SECRET=your-client-secret
# MONDAY_OAUTH_REDIRECT_URI=https://your-app.monday.app/oauth/callback
```

### 3. קבלת Monday API Token

1. היכנס ל-[Monday.com Developer Center](https://auth.monday.com/users/sign_in_developers)
2. פתח את ה-App שלך
3. העתק את ה-API Token
4. הדבק ב-`.env` תחת `MOCK_MONDAY_TOKEN`

📖 **מידע נוסף:** ראה `ENV_SETUP_GUIDE.md` (אם קיים) להוראות מפורטות.

## 🚀 הרצה

### פיתוח מקומי

```bash
# הרצת שרת פיתוח (Vite + Server)
npm run server

# או עם tunnel ל-Monday
npm start
```

השרת יעלה על:
- **Client/Admin Apps:** http://localhost:4040
- **Server API:** http://localhost:8301

### בדיקת טיפוסים

```bash
npm run typecheck
```

## 🏗️ בנייה ופריסה

### בנייה

```bash
# בניית כל הפרויקט
npm run build
```

הקבצים הבנויים יופיעו ב:
- `dist/server/` - קבצי השרת
- `public/` - קבצי הלקוח

### פריסה ל-Monday Code

```bash
# בנייה ופריסה
npm run deploy
```

או בנפרד:

```bash
# בנייה בלבד
npm run deploy:build

# העלאה ל-Monday Code
npm run deploy:push
```

## 📁 מבנה הפרויקט

```
support/
├── src/
│   ├── client/
│   │   ├── admin/          # Admin App (React)
│   │   └── client/         # Client App (React)
│   └── server/             # Server (Express + Monday SDK)
│       ├── routes/         # API Routes
│       ├── services/      # Business Logic
│       └── utils/          # Utilities
├── shared/                 # Shared Types & Constants
├── public/                 # Build Output (Client)
├── dist/                   # Build Output (Server)
├── SPEC/                   # Documentation & Specs
└── package.json
```

### תיקיות עיקריות

- **`src/client/admin/`** - ממשק ניהול למטמיעים (יצירת לינקים, מיפוי עמודות)
- **`src/client/client/`** - ממשק לקוח (הקלטת מסך, שליחת פניות)
- **`src/server/`** - שרת API (OAuth, Storage, Tickets)
- **`shared/`** - טיפוסים וקבועים משותפים

## 📚 תיעוד נוסף

- **`SPEC/ARCHITECTURE.md`** - מסמך ארכיטקטורה מפורט
- **`SPEC/_docs/`** - מסמכי תכנון נוספים
- **`SPEC/Phase0_Setup/`** - הוראות הגדרה ראשונית

## 🔒 אבטחה

⚠️ **חשוב:**
- לעולם אל תעלה את קובץ `.env` ל-Git
- קובץ `local-secure-storage.db.json` מכיל נתונים רגישים - לא להעלות ל-Git
- כל ה-tokens נשמרים ב-Monday Secure Storage (מוצפן)

## 🛠️ פיתוח

### סקריפטים זמינים

```bash
npm run dev          # Vite dev server
npm run server       # Server + Vite concurrently
npm run build        # Build all
npm run typecheck    # Type checking
npm run preview      # Preview build
npm run stop         # Stop all servers
```

## 📝 רישיון

Private - Monday.com App

## 👥 תמיכה

לשאלות ותמיכה, פנה למפתחי הפרויקט.

---

**גרסה:** 1.0.0  
**עדכון אחרון:** 2024-12-24

