/**
 * Supported languages for book generation
 * These languages are well-supported by both OpenAI GPT and Google Gemini
 */

export interface BookLanguage {
 code: string
 name: string
 nativeName: string
 flag: string
}

export const BOOK_LANGUAGES: BookLanguage[] = [
 { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
 { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
 { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
 { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
 { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
 { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
 { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
 { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
 { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
 { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
 { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
 { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
 { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
 { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
 { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
 { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
 { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
 { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
 { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
 { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
 { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
 { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
 { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
 { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
 { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
]

export const DEFAULT_BOOK_LANGUAGE = 'en'

/**
 * Get language by code
 */
export function getLanguageByCode(code: string): BookLanguage | undefined {
 return BOOK_LANGUAGES.find(lang => lang.code === code)
}

/**
 * Get language name with flag
 */
export function getLanguageDisplay(code: string): string {
 const lang = getLanguageByCode(code)
 if (!lang) return code
 return `${lang.flag} ${lang.nativeName}`
}
