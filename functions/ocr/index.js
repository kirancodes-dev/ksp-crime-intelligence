/**
 * Simulated OCR & Vernacular Translation engine for KSP Portal
 */
module.exports = async (fileName, fileType, base64Data) => {
  // Simulate network or OCR processing delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  // Determine mock output based on filename keywords or random choice
  const name = fileName.toLowerCase();
  
  if (name.includes('threat') || name.includes('warning')) {
    return {
      success: true,
      rawKannada: "ಎಚ್ಚರಿಕೆ! ಮುಂದಿನ ವಾರದಲ್ಲಿ ಹಣ ನೀಡದಿದ್ದರೆ ಪರಿಣಾಮ ಎದುರಿಸಬೇಕಾಗುತ್ತದೆ. ರಮೇಶ್ ಕುಮಾರ್ ನಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತಿದ್ದಾನೆ.",
      translatedEnglish: "Warning! If money is not paid by next week, you will face the consequences. Ramesh Kumar is helping us.",
      detectedLanguage: "kn",
      translationConfidence: 0.94,
      entities: {
        suspects: ["Ramesh Kumar"],
        locations: ["Bengaluru Central"],
        dates: ["Next week"],
        monetaryAmount: "None",
        weaponsMentioned: ["None"]
      }
    };
  } else if (name.includes('fir') || name.includes('hawala') || name.includes('cash')) {
    return {
      success: true,
      rawKannada: "ರೂಪಾ ನಾಯಕ್ ಮೂಲಕ ೫೦ ಲಕ್ಷ ರೂಪಾಯಿ ಹವಾಲಾ ಹಣ ವರ್ಗಾವಣೆ ಮಾಡಲಾಗಿದೆ. ಈ ಹಣವನ್ನು ಬೆಂಗಳೂರಿನಲ್ಲಿ ವಿತರಿಸಬೇಕಿತ್ತು.",
      translatedEnglish: "50 Lakh rupees of Hawala cash has been transferred through Rupa Naik. This money was to be distributed in Bengaluru.",
      detectedLanguage: "kn",
      translationConfidence: 0.98,
      entities: {
        suspects: ["Rupa Naik"],
        locations: ["Bengaluru City"],
        dates: ["Today"],
        monetaryAmount: "Rs. 50,000,000 (50 Lakhs)",
        weaponsMentioned: ["None"]
      }
    };
  } else {
    // Default generic vernacular OCR output
    return {
      success: true,
      rawKannada: "ಆರೋಪಿ ಜಗದೀಶ್ ಅಲಿಯಾಸ್ ಜಾಕಿ ಕೊಡಗಿನಲ್ಲಿ ಪಿಸ್ತೂಲ್ ಮತ್ತು ಮದ್ದುಗುಂಡುಗಳೊಂದಿಗೆ ತಲೆಮರೆಸಿಕೊಂಡಿದ್ದಾನೆ.",
      translatedEnglish: "Accused Jagadish alias Jacky is hiding in Kodagu with a pistol and ammunition.",
      detectedLanguage: "kn",
      translationConfidence: 0.96,
      entities: {
        suspects: ["Jagadish"],
        locations: ["Kodagu"],
        dates: ["Unknown"],
        monetaryAmount: "None",
        weaponsMentioned: ["Pistol"]
      }
    };
  }
};
