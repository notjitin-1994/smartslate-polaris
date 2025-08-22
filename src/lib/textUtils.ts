/**
 * Converts a string to Capital Case (Title Case)
 * Examples:
 * - "john doe" -> "John Doe"
 * - "MARY SMITH" -> "Mary Smith"
 * - "jane-marie o'connor" -> "Jane-Marie O'Connor"
 * - "mc donald" -> "Mc Donald"
 */
export function toCapitalCase(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .trim()
    .toLowerCase()
    .split(/(\s|-|')/) // Split on spaces, hyphens, and apostrophes while preserving delimiters
    .map((word, index, array) => {
      // If this is a delimiter (space, hyphen, apostrophe), keep it as is
      if (word.match(/^\s|-|'$/)) return word
      
      // If this is an empty string, skip it
      if (!word) return word
      
      // Capitalize the first letter of each word
      const capitalized = word.charAt(0).toUpperCase() + word.slice(1)
      
      // Handle special cases for common name prefixes
      const prevWord = index > 0 ? array[index - 2] : '' // Get the word before the delimiter
      const prevDelim = index > 0 ? array[index - 1] : '' // Get the delimiter
      
      // Handle cases like "O'Connor" or "McDonald" where the second part should be capitalized
      if (prevDelim === "'" && prevWord.toLowerCase() === 'o') {
        return capitalized
      }
      if (prevWord.toLowerCase() === 'mc' && prevDelim === ' ') {
        return capitalized
      }
      
      return capitalized
    })
    .join('')
}

/**
 * Extracts and capitalizes the first name from a full name string
 */
export function getCapitalizedFirstName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') return ''
  
  const firstName = fullName.trim().split(' ')[0]
  return toCapitalCase(firstName)
}

/**
 * Capitalizes a full name while preserving the full structure
 */
export function getCapitalizedFullName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') return ''
  
  return toCapitalCase(fullName)
}
