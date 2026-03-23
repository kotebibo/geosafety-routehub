'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Language = 'ka' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations: Record<Language, Record<string, string>> = {
  ka: {
    // Navigation
    'nav.home': 'მთავარი',
    'nav.boards': 'დაფები',
    'nav.companies': 'კომპანიები',
    'nav.officers': 'ოფიცრები',
    'nav.locations': 'ლოკაციები',
    'nav.routes': 'მარშრუტები',
    'nav.routeBuilder': 'მარშრუტის შექმნა',
    'nav.assignments': 'დანიშვნები',
    'nav.settings': 'პარამეტრები',
    'nav.collapse': 'ჩაკეცვა',
    'nav.expand': 'გაშლა',

    // Header
    'header.search': 'ძებნა...',
    'header.help': 'დახმარება',
    'header.notifications': 'შეტყობინებები',
    'header.profile': 'პროფილი',
    'header.signOut': 'გასვლა',

    // Breadcrumbs
    'breadcrumb.home': 'მთავარი',
    'breadcrumb.companies': 'კომპანიები',
    'breadcrumb.inspectors': 'ოფიცრები',
    'breadcrumb.locations': 'ლოკაციები',
    'breadcrumb.routes': 'მარშრუტები',
    'breadcrumb.builder': 'მარშრუტის შექმნა',
    'breadcrumb.manage': 'მართვა',
    'breadcrumb.admin': 'ადმინისტრაცია',
    'breadcrumb.assignments': 'დანიშვნები',
    'breadcrumb.inspector': 'ოფიცერი',
    'breadcrumb.settings': 'პარამეტრები',
    'breadcrumb.boards': 'დაფები',

    // Roles
    'role.admin': 'ადმინისტრატორი',
    'role.dispatcher': 'დისპეტჩერი',
    'role.officer': 'ოფიცერი',

    // Home page
    'home.title': 'RouteHub',
    'home.subtitle': 'მარშრუტების ოპტიმიზაციისა და მართვის პლატფორმა',
    'home.greeting': 'გამარჯობა',
    'home.quickActions': 'სწრაფი მოქმედებები',
    'home.companyManagement': 'კომპანიების მართვა',
    'home.officers': 'ოფიცრები',
    'home.teamManagement': 'გუნდის მართვა',
    'home.assignments': 'დანიშვნები',
    'home.workDistribution': 'სამუშაოს განაწილება',
    'home.createRoute': 'მარშრუტის შექმნა',
    'home.optimization': 'ოპტიმიზაცია',
    'home.manageRoutes': 'მარშრუტების მართვა',
    'home.allRoutes': 'ყველა მარშრუტი',
    'home.myRoutes': 'ჩემი მარშრუტები',
    'home.boardsDescription': 'სამუშაო დაფები',
    'home.todaysPlan': 'დღევანდელი გეგმა',
    'home.readyToStart': 'მზად ხართ დასაწყებად?',
    'home.joinCompanies': 'შეუერთდით ასობით კომპანიას, რომლებიც უკვე იყენებენ RouteHub-ს',
    'home.signIn': 'შესვლა',
    'home.register': 'რეგისტრაცია',
    'home.copyright': '© 2025 RouteHub. ყველა უფლება დაცულია.',
    'home.about': 'შესახებ',
    'home.documentation': 'დოკუმენტაცია',
    'home.support': 'მხარდაჭერა',
    'home.contact': 'კონტაქტი',

    // Common
    'common.loading': 'იტვირთება...',
    'common.save': 'შენახვა',
    'common.cancel': 'გაუქმება',
    'common.delete': 'წაშლა',
    'common.edit': 'რედაქტირება',
    'common.add': 'დამატება',
    'common.search': 'ძებნა',
    'common.filter': 'ფილტრი',
    'common.export': 'ექსპორტი',
    'common.back': 'უკან',
    'common.next': 'შემდეგი',
    'common.previous': 'წინა',
    'common.confirm': 'დადასტურება',
    'common.close': 'დახურვა',
    'common.language': 'ენა',

    // Login
    'login.title': 'RouteHub',
    'login.subtitle': 'მარშრუტების მართვის პლატფორმა',
    'login.email': 'ელ.ფოსტა',
    'login.password': 'პაროლი',
    'login.signIn': 'შესვლა',
    'login.signingIn': 'შესვლა...',
    'login.forgotPassword': 'პაროლი დაგავიწყდათ?',
    'login.noAccount': 'არ გაქვთ ანგარიში?',
    'login.signUp': 'რეგისტრაცია',
    'login.signingUp': 'რეგისტრაცია...',
    'login.orContinueWith': 'ან',
    'login.signInWithGoogle': 'Google-ით შესვლა',
    'login.signingInWithGoogle': 'Google-ით შესვლა...',
    'login.loginToSystem': 'შესვლა სისტემაში',
    'login.createAccount': 'ახალი ანგარიშის შექმნა',
    'login.fullName': 'სახელი და გვარი',
    'login.fullNamePlaceholder': 'თქვენი სახელი',
    'login.confirmPassword': 'პაროლის დადასტურება',
    'login.minChars': 'მინიმუმ 6 სიმბოლო',
    'login.registerNow': 'დარეგისტრირდით',
    'login.alreadyHaveAccount': 'უკვე გაქვთ ანგარიში?',
    'login.passwordsMismatch': 'პაროლები არ ემთხვევა',
    'login.passwordTooShort': 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო',
    'login.alreadyRegistered': 'ეს ელ.ფოსტა უკვე რეგისტრირებულია',
    'login.registrationSuccess':
      'რეგისტრაცია წარმატებით დასრულდა! შეამოწმეთ ელ.ფოსტა დასადასტურებლად.',
    'login.invalidCredentials': 'არასწორი ელ.ფოსტა ან პაროლი',
    'login.emailNotConfirmed': 'გთხოვთ დაადასტუროთ ელ.ფოსტა შესვლამდე',
    'login.signupError': 'შეცდომა რეგისტრაციისას. გთხოვთ სცადოთ თავიდან.',
    'login.signinError': 'შეცდომა შესვლისას. გთხოვთ სცადოთ თავიდან.',
    'login.googleError': 'Google-ით შესვლა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.',
    'login.enterEmailFirst': 'ჯერ შეიყვანეთ ელ.ფოსტა',
    'login.resetEmailSent': 'პაროლის აღდგენის ბმული გამოგზავნილია თქვენს ელ.ფოსტაზე',
    'login.resetError': 'პაროლის აღდგენა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.',

    // Reset password
    'reset.title': 'პაროლის შეცვლა',
    'reset.newPassword': 'ახალი პაროლი',
    'reset.confirmPassword': 'პაროლის დადასტურება',
    'reset.submit': 'პაროლის შეცვლა',
    'reset.submitting': 'იცვლება...',
    'reset.success': 'პაროლი წარმატებით შეიცვალა!',
    'reset.error': 'პაროლის შეცვლა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.',
    'reset.mismatch': 'პაროლები არ ემთხვევა',
    'reset.tooShort': 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო',
    'reset.goToLogin': 'შესვლის გვერდზე გადასვლა',

    // Walkthrough
    'walkthrough.welcome.title': 'მოგესალმებით RouteHub-ში!',
    'walkthrough.welcome.description':
      'მოდით გაგაცნოთ პლატფორმის ძირითადი ფუნქციები. ეს მხოლოდ რამდენიმე წამს წაიღებს.',
    'walkthrough.sidebar.title': 'ნავიგაცია',
    'walkthrough.sidebar.description':
      'გვერდითი პანელი არის თქვენი მთავარი ნავიგაცია. აქედან შეგიძლიათ გადახვიდეთ ნებისმიერ გვერდზე.',
    'walkthrough.boards.title': 'დაფები',
    'walkthrough.boards.description':
      'დაფები არის თქვენი სამუშაო სივრცე. შექმენით დაფები პროექტების, ამოცანების და მონაცემების სამართავად.',
    'walkthrough.companies.title': 'კომპანიები',
    'walkthrough.companies.description':
      'აქ მართავთ კომპანიებს — დაამატეთ ახალი, შეცვალეთ ინფორმაცია და მიანიჭეთ ოფიცრები.',
    'walkthrough.routes.title': 'მარშრუტები',
    'walkthrough.routes.description':
      'დაგეგმეთ და ოპტიმიზირეთ მარშრუტები. სისტემა ავტომატურად შეარჩევს ოპტიმალურ თანმიმდევრობას.',
    'walkthrough.language.title': 'ენის შეცვლა',
    'walkthrough.language.description':
      'შეგიძლიათ გადართოთ ენა ქართულიდან ინგლისურზე ნებისმიერ დროს ამ ღილაკით.',
    'walkthrough.done.title': 'მზად ხართ!',
    'walkthrough.done.description':
      'ეს არის ძირითადი ფუნქციები. თუ დაგჭირდებათ, ტურის ხელახლა გავლა შეგიძლიათ პარამეტრებიდან.',
    'walkthrough.finish': 'დასრულება',

    // 404 page
    '404.title': 'გვერდი ვერ მოიძებნა',
    '404.description': 'გვერდი, რომელსაც ეძებთ, არ არსებობს ან გადატანილია.',
    '404.goHome': 'მთავარ გვერდზე დაბრუნება',

    // Settings page
    'settings.title': 'პარამეტრები',
    'settings.subtitle': 'მომხმარებლის პარამეტრები და პრეფერენციები',
    'settings.tab.profile': 'პროფილი',
    'settings.tab.notifications': 'შეტყობინებები',
    'settings.tab.language': 'ენა',
    'settings.tab.security': 'უსაფრთხოება',
    'settings.profile.title': 'პროფილის ინფორმაცია',
    'settings.profile.name': 'სახელი და გვარი',
    'settings.profile.namePlaceholder': 'შეიყვანეთ სახელი და გვარი',
    'settings.profile.email': 'ელ-ფოსტა',
    'settings.profile.emailReadonly': 'ელ-ფოსტის შეცვლა შეუძლებელია',
    'settings.profile.phone': 'ტელეფონი',
    'settings.profile.user': 'მომხმარებელი',
    'settings.notifications.title': 'შეტყობინებების პარამეტრები',
    'settings.notifications.email': 'ელ-ფოსტის შეტყობინებები',
    'settings.notifications.emailDesc': 'მიიღეთ შეტყობინებები ელ-ფოსტით',
    'settings.notifications.assignments': 'დავალებების შეტყობინებები',
    'settings.notifications.assignmentsDesc': 'შეტყობინება ახალი დავალებების შესახებ',
    'settings.notifications.routes': 'მარშრუტის განახლებები',
    'settings.notifications.routesDesc': 'შეტყობინება მარშრუტის ცვლილებების შესახებ',
    'settings.language.title': 'ენის პარამეტრები',
    'settings.language.interface': 'ინტერფეისის ენა',
    'settings.security.title': 'უსაფრთხოება',
    'settings.security.changePassword': 'პაროლის შეცვლა',
    'settings.security.changePasswordDesc':
      'პაროლის შეცვლა ხდება ელ-ფოსტით. დააჭირეთ ღილაკს და მიიღებთ ბმულს ელ-ფოსტაზე.',
    'settings.security.passwordSent': 'პაროლის შეცვლის ბმული გამოგზავნილია თქვენს ელ-ფოსტაზე',
    'settings.security.sessions': 'აქტიური სესიები',
    'settings.security.sessionsDesc': 'ყველა სესიიდან გამოსვლა სხვა მოწყობილობებზე',
    'settings.security.signOutAll': 'ყველასგან გამოსვლა',
    'settings.saved': 'შენახულია',
    'settings.saving': 'ინახება...',
    'settings.walkthrough.title': 'ინტერაქტიული ტური',
    'settings.walkthrough.description': 'ხელახლა გაიარეთ პლატფორმის ტური',
    'settings.walkthrough.restart': 'ტურის გავლა',

    // Theme settings
    'settings.tab.appearance': 'გარეგნობა',
    'settings.appearance.title': 'გარეგნობის პარამეტრები',
    'settings.appearance.theme': 'თემა',
    'settings.appearance.themeDesc': 'აირჩიეთ სასურველი ფერთა სქემა',
    'settings.theme.light': 'ნათელი',
    'settings.theme.lightDesc': 'კლასიკური ნათელი ინტერფეისი',
    'settings.theme.dark': 'მუქი',
    'settings.theme.darkDesc': 'მუქი ფერები, იცავს თვალებს',
    'settings.theme.night': 'ღამის',
    'settings.theme.nightDesc': 'ღრმა ლურჯი, კონცენტრაციისთვის',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.boards': 'Boards',
    'nav.companies': 'Companies',
    'nav.officers': 'Officers',
    'nav.locations': 'Locations',
    'nav.routes': 'Routes',
    'nav.routeBuilder': 'Route Builder',
    'nav.assignments': 'Assignments',
    'nav.settings': 'Settings',
    'nav.collapse': 'Collapse',
    'nav.expand': 'Expand',

    // Header
    'header.search': 'Search...',
    'header.help': 'Help',
    'header.notifications': 'Notifications',
    'header.profile': 'Profile',
    'header.signOut': 'Sign Out',

    // Breadcrumbs
    'breadcrumb.home': 'Home',
    'breadcrumb.companies': 'Companies',
    'breadcrumb.inspectors': 'Officers',
    'breadcrumb.locations': 'Locations',
    'breadcrumb.routes': 'Routes',
    'breadcrumb.builder': 'Route Builder',
    'breadcrumb.manage': 'Manage',
    'breadcrumb.admin': 'Admin',
    'breadcrumb.assignments': 'Assignments',
    'breadcrumb.inspector': 'Officer',
    'breadcrumb.settings': 'Settings',
    'breadcrumb.boards': 'Boards',

    // Roles
    'role.admin': 'Administrator',
    'role.dispatcher': 'Dispatcher',
    'role.officer': 'Officer',

    // Home page
    'home.title': 'RouteHub',
    'home.subtitle': 'Route optimization and management platform',
    'home.greeting': 'Hello',
    'home.quickActions': 'Quick Actions',
    'home.companyManagement': 'Company Management',
    'home.officers': 'Officers',
    'home.teamManagement': 'Team Management',
    'home.assignments': 'Assignments',
    'home.workDistribution': 'Work Distribution',
    'home.createRoute': 'Create Route',
    'home.optimization': 'Optimization',
    'home.manageRoutes': 'Manage Routes',
    'home.allRoutes': 'All Routes',
    'home.myRoutes': 'My Routes',
    'home.boardsDescription': 'Work Boards',
    'home.todaysPlan': "Today's Plan",
    'home.readyToStart': 'Ready to get started?',
    'home.joinCompanies': 'Join hundreds of companies already using RouteHub',
    'home.signIn': 'Sign In',
    'home.register': 'Register',
    'home.copyright': '© 2025 RouteHub. All rights reserved.',
    'home.about': 'About',
    'home.documentation': 'Documentation',
    'home.support': 'Support',
    'home.contact': 'Contact',

    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.language': 'Language',

    // Login
    'login.title': 'RouteHub',
    'login.subtitle': 'Route Management Platform',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.signIn': 'Sign In',
    'login.signingIn': 'Signing in...',
    'login.forgotPassword': 'Forgot password?',
    'login.noAccount': "Don't have an account?",
    'login.signUp': 'Sign Up',
    'login.orContinueWith': 'Or continue with',
    'login.signInWithGoogle': 'Sign in with Google',
    'login.signingInWithGoogle': 'Signing in with Google...',
    'login.loginToSystem': 'Sign in to your account',
    'login.createAccount': 'Create a new account',
    'login.fullName': 'Full Name',
    'login.fullNamePlaceholder': 'Your name',
    'login.confirmPassword': 'Confirm Password',
    'login.minChars': 'Minimum 6 characters',
    'login.registerNow': 'Register',
    'login.alreadyHaveAccount': 'Already have an account?',
    'login.passwordsMismatch': 'Passwords do not match',
    'login.passwordTooShort': 'Password must be at least 6 characters',
    'login.alreadyRegistered': 'This email is already registered',
    'login.registrationSuccess': 'Registration successful! Check your email to confirm.',
    'login.invalidCredentials': 'Invalid email or password',
    'login.emailNotConfirmed': 'Please confirm your email before signing in',
    'login.signupError': 'Registration error. Please try again.',
    'login.signinError': 'Sign in error. Please try again.',
    'login.googleError': 'Google sign in failed. Please try again.',
    'login.enterEmailFirst': 'Please enter your email first',
    'login.resetEmailSent': 'Password reset link has been sent to your email',
    'login.resetError': 'Password reset failed. Please try again.',

    // Reset password
    'reset.title': 'Reset Password',
    'reset.newPassword': 'New Password',
    'reset.confirmPassword': 'Confirm Password',
    'reset.submit': 'Reset Password',
    'reset.submitting': 'Resetting...',
    'reset.success': 'Password changed successfully!',
    'reset.error': 'Failed to reset password. Please try again.',
    'reset.mismatch': 'Passwords do not match',
    'reset.tooShort': 'Password must be at least 6 characters',
    'reset.goToLogin': 'Go to login',

    // Walkthrough
    'walkthrough.welcome.title': 'Welcome to RouteHub!',
    'walkthrough.welcome.description':
      'Let us show you the key features of the platform. This will only take a few seconds.',
    'walkthrough.sidebar.title': 'Navigation',
    'walkthrough.sidebar.description':
      'The sidebar is your main navigation. Use it to access any page in the app.',
    'walkthrough.boards.title': 'Boards',
    'walkthrough.boards.description':
      'Boards are your workspace. Create boards to manage projects, tasks, and data.',
    'walkthrough.companies.title': 'Companies',
    'walkthrough.companies.description':
      'Manage companies here — add new ones, edit information, and assign officers.',
    'walkthrough.routes.title': 'Routes',
    'walkthrough.routes.description':
      'Plan and optimize routes. The system automatically finds the optimal order.',
    'walkthrough.language.title': 'Change Language',
    'walkthrough.language.description':
      'You can switch between Georgian and English at any time using this button.',
    'walkthrough.done.title': "You're all set!",
    'walkthrough.done.description':
      'Those are the key features. You can restart this tour anytime from Settings.',
    'walkthrough.finish': 'Finish',

    // 404 page
    '404.title': 'Page Not Found',
    '404.description': "The page you're looking for doesn't exist or has been moved.",
    '404.goHome': 'Go Home',

    // Settings page
    'settings.title': 'Settings',
    'settings.subtitle': 'User settings and preferences',
    'settings.tab.profile': 'Profile',
    'settings.tab.notifications': 'Notifications',
    'settings.tab.language': 'Language',
    'settings.tab.security': 'Security',
    'settings.profile.title': 'Profile Information',
    'settings.profile.name': 'Full Name',
    'settings.profile.namePlaceholder': 'Enter your full name',
    'settings.profile.email': 'Email',
    'settings.profile.emailReadonly': 'Email cannot be changed',
    'settings.profile.phone': 'Phone',
    'settings.profile.user': 'User',
    'settings.notifications.title': 'Notification Settings',
    'settings.notifications.email': 'Email Notifications',
    'settings.notifications.emailDesc': 'Receive notifications via email',
    'settings.notifications.assignments': 'Assignment Alerts',
    'settings.notifications.assignmentsDesc': 'Get notified about new assignments',
    'settings.notifications.routes': 'Route Updates',
    'settings.notifications.routesDesc': 'Get notified about route changes',
    'settings.language.title': 'Language Settings',
    'settings.language.interface': 'Interface Language',
    'settings.security.title': 'Security',
    'settings.security.changePassword': 'Change Password',
    'settings.security.changePasswordDesc':
      'Password is changed via email. Click the button to receive a reset link.',
    'settings.security.passwordSent': 'Password reset link has been sent to your email',
    'settings.security.sessions': 'Active Sessions',
    'settings.security.sessionsDesc': 'Sign out from all other devices',
    'settings.security.signOutAll': 'Sign Out All',
    'settings.saved': 'Saved',
    'settings.saving': 'Saving...',
    'settings.walkthrough.title': 'Interactive Tour',
    'settings.walkthrough.description': 'Restart the platform walkthrough tour',
    'settings.walkthrough.restart': 'Start Tour',

    // Theme settings
    'settings.tab.appearance': 'Appearance',
    'settings.appearance.title': 'Appearance Settings',
    'settings.appearance.theme': 'Theme',
    'settings.appearance.themeDesc': 'Choose your preferred color scheme',
    'settings.theme.light': 'Light',
    'settings.theme.lightDesc': 'Classic light interface',
    'settings.theme.dark': 'Dark',
    'settings.theme.darkDesc': 'Dark colors, easy on the eyes',
    'settings.theme.night': 'Night',
    'settings.theme.nightDesc': 'Deep blue, for focused work',
  },
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ka')

  useEffect(() => {
    const stored = localStorage.getItem('routehub-language') as Language | null
    if (stored && (stored === 'ka' || stored === 'en')) {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('routehub-language', lang)
  }, [])

  const t = useCallback(
    (key: string): string => {
      return translations[language][key] || key
    },
    [language]
  )

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
