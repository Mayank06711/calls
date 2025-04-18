export const dummyResponses = [
    {
      text: "Your style choices are spot-on! Have you considered adding some accessories to enhance the look further?",
      type: "confidence"
    },
    {
      text: "That's a great question about fashion! Based on current trends, I'd recommend experimenting with layered looks.",
      type: "advice"
    },
    {
      text: "Remember, confidence is your best accessory. The outfit you described would definitely help showcase your personality!",
      type: "motivation"
    },
    {
      text: "I can suggest some color combinations that would work well with your style preferences. Would you like to explore that?",
      type: "suggestion"
    },
    {
      text: "Your fashion instincts are right on track. Let's explore how to make this look even more uniquely yours.",
      type: "feedback"
    }
  ];
  
  export const getRandomResponse = () => {
    const randomIndex = Math.floor(Math.random() * dummyResponses.length);
    return dummyResponses[randomIndex];
  };