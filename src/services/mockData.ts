export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestions?: string[];
  attachments?: {
    name: string;
    meta: string;
    type: 'pdf' | 'image' | 'prescription' | 'lab';
  }[];
}

export interface Conversation {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

export const mockConsultationHistory: Conversation[] = [
  {
    id: '1',
    title: 'Fever and headache',
    date: 'Today, 10:30 AM',
    messages: [
      {
        id: 'm1',
        sender: 'ai',
        text: "Hello, I'm Mediguide X. I can help you understand symptoms, review reports, explain prescriptions, and guide you with trusted health information.\nWhat brings you in today?",
        timestamp: '10:30 AM',
      },
      {
        id: 'm2',
        sender: 'user',
        text: 'I have had a fever since yesterday with a dull headache.',
        timestamp: '10:31 AM',
      },
      {
        id: 'm3',
        sender: 'ai',
        text: "I'm sorry you are feeling unwell. Before I suggest next steps, I need a little more context.\n- What is your age?\n- What is your current temperature?\n- Do you have cough, sore throat, body ache, or chills?\n- Any breathing difficulty, chest pain, rash, or confusion?\n- Have you taken any medicine since the fever started?",
        timestamp: '10:33 AM',
        suggestions: ['I am 29 years old', 'Temperature is 101°F', 'Mild cough and chills', 'No breathing difficulty']
      },
      {
        id: 'm4',
        sender: 'user',
        text: 'I am 29. Temperature is around 101°F. I have mild cough and chills, no breathing difficulty.',
        timestamp: '10:35 AM',
      },
      {
        id: 'm5',
        sender: 'ai',
        text: "Thanks, that helps. This pattern is commonly seen with a viral fever, but monitoring is important.\n- Hydrate frequently and rest.\n- Consider paracetamol only as per label or your clinician's advice.\n- Check temperature every 4 to 6 hours.\n- Seek urgent care if fever crosses 103°F, breathing becomes difficult, symptoms worsen, or fever persists beyond 3 days.\nWould you like me to help prepare a short symptom summary for a doctor?",
        timestamp: '10:36 AM',
        suggestions: ['Create doctor summary', 'What tests are needed?', 'Home care checklist']
      }
    ]
  },
  {
    id: '2',
    title: 'Blood test report review',
    date: 'Yesterday',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        text: 'Can you review my blood test report?',
        timestamp: '09:00 AM',
        attachments: [
          { name: 'CBC_Report_June.pdf', meta: '2 pages, 1.2 MB', type: 'lab' }
        ]
      },
      {
        id: 'm2',
        sender: 'ai',
        text: "I can help interpret the values. Before summarizing, please confirm:\n- Was this a fasting test?\n- Are you currently taking iron, B12, or antibiotics?\n- Do you have fatigue, fever, weight loss, or recent infection?",
        timestamp: '09:02 AM',
        suggestions: ['It was fasting', 'I feel fatigued', 'No current medication']
      },
      {
        id: 'm3',
        sender: 'user',
        text: 'It was fasting. I feel a bit fatigued but no fever.',
        timestamp: '09:05 AM',
      },
      {
        id: 'm4',
        sender: 'ai',
        text: "From the attached CBC, hemoglobin appears mildly low and MCV is near the lower range, which can happen with iron deficiency. Platelets and WBC look within expected range in this mock report.\nConsider discussing ferritin, B12, and dietary iron review with your physician, especially if fatigue continues.",
        timestamp: '09:06 AM',
        suggestions: ['Explain hemoglobin', 'Show questions for doctor', 'Diet suggestions']
      }
    ]
  },
  {
    id: '3',
    title: 'Prescription explanation',
    date: '2 days ago',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        text: 'Can you explain this prescription in simple terms?',
        timestamp: '07:42 PM',
        attachments: [
          { name: 'Dr_Sharma_Prescription.jpg', meta: 'Image, 640 KB', type: 'prescription' }
        ]
      },
      {
        id: 'm2',
        sender: 'ai',
        text: "Yes. Before I explain dosage and precautions, please confirm:\n- Your age and approximate weight\n- Any drug allergies\n- Whether you are pregnant, breastfeeding, or have kidney or liver disease\n- The condition this was prescribed for",
        timestamp: '07:43 PM',
        suggestions: ['No allergies', 'For throat infection', 'I am 34 years old']
      },
      {
        id: 'm3',
        sender: 'user',
        text: 'I am 34, no allergies. It was prescribed for throat infection.',
        timestamp: '07:45 PM',
      },
      {
        id: 'm4',
        sender: 'ai',
        text: "Here is the simple version: the antibiotic should usually be taken at evenly spaced times and completed as prescribed. The fever medicine is typically for temperature or pain. Avoid doubling doses if one is missed.\nPlease verify the exact medicine names with your pharmacist if any handwriting is unclear.",
        timestamp: '07:47 PM',
        suggestions: ['Side effects', 'Missed dose help', 'Food interactions']
      }
    ]
  },
  {
    id: '4',
    title: 'Thyroid test report',
    date: '3 days ago',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        text: 'My TSH is high. What does it mean?',
        timestamp: '11:16 AM',
        attachments: [
          { name: 'Thyroid_Profile.pdf', meta: 'TSH, T3, T4', type: 'pdf' }
        ]
      },
      {
        id: 'm2',
        sender: 'ai',
        text: "A high TSH can suggest the thyroid is underactive, but interpretation depends on T3, T4, symptoms, and medication history.\n- What are your TSH and free T4 values?\n- Are you already taking thyroid medicine?\n- Any fatigue, weight gain, constipation, hair fall, or cold intolerance?",
        timestamp: '11:18 AM',
        suggestions: ['TSH is 7.8', 'Free T4 is normal', 'I feel tired']
      },
      {
        id: 'm3',
        sender: 'user',
        text: 'TSH is 7.8 and free T4 is normal. I feel tired lately.',
        timestamp: '11:20 AM',
      },
      {
        id: 'm4',
        sender: 'ai',
        text: "That combination may fit subclinical hypothyroidism, especially if free T4 is normal. Your doctor may consider repeat testing, anti-TPO antibodies, and treatment depending on symptoms, pregnancy plans, cholesterol, and TSH trend.",
        timestamp: '11:21 AM',
        suggestions: ['Doctor questions', 'Lifestyle checklist', 'Explain anti-TPO']
      }
    ]
  },
  {
    id: '5',
    title: 'Diabetes follow up',
    date: '4 days ago',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        text: 'My fasting glucose was 132 and HbA1c is 7.1.',
        timestamp: '08:22 AM',
      },
      {
        id: 'm2',
        sender: 'ai',
        text: "Thanks for sharing. To guide you better:\n- Were both tests done recently?\n- Are you already diagnosed with diabetes?\n- What medicines are you taking?\n- Any symptoms like excessive thirst, frequent urination, blurred vision, or weight changes?",
        timestamp: '08:24 AM',
        suggestions: ['Recently diagnosed', 'Taking metformin', 'No major symptoms']
      },
      {
        id: 'm3',
        sender: 'user',
        text: 'Recently diagnosed. I started metformin last month.',
        timestamp: '08:26 AM',
      },
      {
        id: 'm4',
        sender: 'ai',
        text: "An HbA1c of 7.1% is above the usual target for many adults, though targets vary. Keep a glucose log, review diet timing, and follow up with your clinician to adjust the plan safely.\nI can create a 7-day tracking template if helpful.",
        timestamp: '08:27 AM',
        suggestions: ['Create tracker', 'Meal timing tips', 'Exercise guidance']
      }
    ]
  },
  {
    id: '6',
    title: 'Vitamin D deficiency',
    date: '1 week ago',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        text: 'My Vitamin D level is 14 ng/mL. Is that low?',
        timestamp: '05:11 PM',
      },
      {
        id: 'm2',
        sender: 'ai',
        text: "Yes, 14 ng/mL is generally considered deficient. A safe plan depends on your age, calcium level, kidney history, and current supplements.\nDo you have bone pain, muscle weakness, or fatigue? Are you taking calcium or vitamin D already?",
        timestamp: '05:12 PM',
        suggestions: ['I feel fatigued', 'Not taking supplements', 'Explain dosage ranges']
      },
      {
        id: 'm3',
        sender: 'ai',
        text: "Please discuss replacement dosing with your clinician. Many plans use weekly or daily vitamin D for a limited period, then maintenance dosing, but the dose should match your medical context and lab follow-up.",
        timestamp: '05:14 PM',
        suggestions: ['Food sources', 'Sun exposure tips', 'Follow-up test timing']
      }
    ]
  },
  {
    id: '7',
    title: 'Cold and cough',
    date: '1 week ago',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        text: 'I have a runny nose and dry cough for 3 days.',
        timestamp: '03:05 PM',
      },
      {
        id: 'm2',
        sender: 'ai',
        text: "Let's screen for warning signs first.\n- Any fever above 101°F?\n- Any wheezing or shortness of breath?\n- Chest pain, blood in sputum, or severe weakness?\n- Do you have asthma, COPD, or heart disease?",
        timestamp: '03:06 PM',
        suggestions: ['No fever', 'No shortness of breath', 'Mild sore throat']
      },
      {
        id: 'm3',
        sender: 'user',
        text: 'No fever or breathing issue. Mild sore throat only.',
        timestamp: '03:09 PM',
      },
      {
        id: 'm4',
        sender: 'ai',
        text: "This sounds consistent with an uncomplicated upper respiratory infection. Fluids, warm saline gargles, steam, and honey may help if suitable for you. Seek care if symptoms worsen, fever appears, or cough lasts more than 2 weeks.",
        timestamp: '03:10 PM',
        suggestions: ['Cough care', 'When to test', 'Medicine precautions']
      }
    ]
  },
  {
    id: '8',
    title: 'Stomach pain analysis',
    date: '2 weeks ago',
    messages: [
      {
        id: 'm1',
        sender: 'user',
        text: 'I have stomach pain after meals.',
        timestamp: '01:18 PM',
      },
      {
        id: 'm2',
        sender: 'ai',
        text: "I can help narrow possibilities. Please tell me:\n- Where exactly is the pain?\n- Is it burning, cramping, sharp, or bloating?\n- Any vomiting, black stools, fever, weight loss, or severe tenderness?\n- Does spicy food, alcohol, or painkiller use make it worse?",
        timestamp: '01:19 PM',
        suggestions: ['Upper abdomen burning', 'Worse with spicy food', 'No black stools']
      },
      {
        id: 'm3',
        sender: 'user',
        text: 'Upper abdomen burning, worse with spicy food. No black stools.',
        timestamp: '01:22 PM',
      },
      {
        id: 'm4',
        sender: 'ai',
        text: "That pattern may fit acidity or gastritis, but only a clinician can diagnose. Avoid triggers, avoid unnecessary painkillers, eat smaller meals, and seek urgent care for severe pain, vomiting blood, black stools, or unexplained weight loss.",
        timestamp: '01:24 PM',
        suggestions: ['Food checklist', 'Doctor summary', 'Red flags']
      }
    ]
  },
];

export const mockHealthMetrics = {
  heartRate: { value: 72, unit: 'bpm', status: 'Normal' },
  bloodPressure: { value: '118/76', unit: 'mmHg', status: 'Normal' },
  healthScore: { value: 85, max: 100, status: 'Good' },
};

export const mockUpcomingEvents = [
  {
    id: 'e1',
    type: 'lab',
    title: 'Complete Blood Count',
    subtitle: 'Lab Test',
    date: '12 Jun, 2025',
    time: '09:00 AM'
  },
  {
    id: 'e2',
    type: 'doctor',
    title: 'Dr. Arpita Sharma',
    subtitle: 'General Physician',
    date: '14 Jun, 2025',
    time: '10:30 AM'
  }
];
