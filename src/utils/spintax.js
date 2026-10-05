/**
 * Spintax Parser & Dynamic Variable Engine
 * Supports {Option A|Option B|Option C} pattern and {variable_name} replacement
 */

/**
 * Evaluates Spintax string and produces a randomized, unique variation
 * Example: "{Hello|Hi|Dear} {User|Customer}!" -> "Hi Dear!"
 * @param {string} text 
 * @returns {string} Processed text
 */
function processSpintax(text) {
  if (!text || typeof text !== 'string') return '';
  
  const spintaxRegex = /\{([^{}]+)\}/g;
  let matches;
  let result = text;

  // Process nested or multiple spintax blocks
  while ((matches = spintaxRegex.exec(result)) !== null) {
    const fullMatch = matches[0];
    const optionsString = matches[1];

    // Check if this looks like a variable or spintax (contains pipe '|')
    if (optionsString.includes('|')) {
      const choices = optionsString.split('|').map(c => c.trim());
      const selected = choices[Math.floor(Math.random() * choices.length)];
      result = result.replace(fullMatch, selected);
      // Reset regex index to scan from start of modified string
      spintaxRegex.lastIndex = 0;
    }
  }

  return result;
}

/**
 * Replaces dynamic variables in text
 * Example: "Hello {name}, your bill is {amount}" with { name: 'Rahim', amount: '$50' }
 * @param {string} text 
 * @param {object} variables 
 * @returns {string}
 */
function replaceVariables(text, variables = {}) {
  if (!text) return '';
  let result = text;

  const now = new Date();
  const defaultVars = {
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString('en-US', { hour12: true }),
    datetime: now.toLocaleString(),
    timestamp: Date.now().toString(),
    ...variables
  };

  for (const [key, value] of Object.entries(defaultVars)) {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      result = result.replace(regex, String(value));
    }
  }

  return result;
}

/**
 * Combines variable replacement and Spintax parsing
 * @param {string} template 
 * @param {object} variables 
 * @returns {string}
 */
function renderMessage(template, variables = {}) {
  const withVars = replaceVariables(template, variables);
  return processSpintax(withVars);
}

module.exports = {
  processSpintax,
  replaceVariables,
  renderMessage
};
