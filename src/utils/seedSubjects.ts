import { Subject } from '../models/Subject';

const initialSubjects = [
  // Mathematics
  { name: 'Algebra', category: 'Mathematics', description: 'Fundamental algebraic concepts and problem solving' },
  { name: 'Calculus', category: 'Mathematics', description: 'Differential and integral calculus' },
  { name: 'Geometry', category: 'Mathematics', description: 'Euclidean geometry and spatial reasoning' },
  { name: 'Statistics', category: 'Mathematics', description: 'Data analysis and probability' },
  { name: 'Trigonometry', category: 'Mathematics', description: 'Trigonometric functions and identities' },
  
  // Science
  { name: 'Physics', category: 'Science', description: 'Mechanics, thermodynamics, and modern physics' },
  { name: 'Chemistry', category: 'Science', description: 'Organic and inorganic chemistry' },
  { name: 'Biology', category: 'Science', description: 'Cell biology, genetics, and ecology' },
  { name: 'Environmental Science', category: 'Science', description: 'Environmental systems and sustainability' },
  
  // Language
  { name: 'English Literature', category: 'Language', description: 'Classic and contemporary literature' },
  { name: 'English Grammar', category: 'Language', description: 'Grammar, syntax, and writing skills' },
  { name: 'Spanish', category: 'Language', description: 'Spanish language and culture' },
  { name: 'French', category: 'Language', description: 'French language and culture' },
  { name: 'German', category: 'Language', description: 'German language and culture' },
  
  // Computer Science
  { name: 'Programming', category: 'Computer Science', description: 'Software development and coding' },
  { name: 'Web Development', category: 'Computer Science', description: 'HTML, CSS, JavaScript, and frameworks' },
  { name: 'Data Science', category: 'Computer Science', description: 'Data analysis and machine learning' },
  { name: 'Database Management', category: 'Computer Science', description: 'SQL and database design' },
  
  // Social Studies
  { name: 'History', category: 'Social Studies', description: 'World history and historical analysis' },
  { name: 'Geography', category: 'Social Studies', description: 'Physical and human geography' },
  { name: 'Economics', category: 'Social Studies', description: 'Micro and macro economics' },
  { name: 'Political Science', category: 'Social Studies', description: 'Government and political systems' },
  
  // Arts
  { name: 'Art History', category: 'Arts', description: 'Art movements and cultural significance' },
  { name: 'Music Theory', category: 'Arts', description: 'Musical composition and theory' },
  { name: 'Creative Writing', category: 'Arts', description: 'Fiction, poetry, and creative expression' },
  
  // Other
  { name: 'Test Preparation', category: 'Other', description: 'SAT, ACT, GRE, and other standardized tests' },
  { name: 'Study Skills', category: 'Other', description: 'Effective study techniques and time management' },
  { name: 'Public Speaking', category: 'Other', description: 'Presentation skills and communication' },
];

export const seedSubjects = async () => {
  try {
    console.log('Seeding subjects...');
    
    for (const subjectData of initialSubjects) {
      const existingSubject = await Subject.findOne({ name: subjectData.name });
      if (!existingSubject) {
        await Subject.create(subjectData);
        console.log(`Created subject: ${subjectData.name}`);
      } else {
        console.log(`Subject already exists: ${subjectData.name}`);
      }
    }
    
    console.log('Subject seeding completed!');
  } catch (error) {
    console.error('Error seeding subjects:', error);
  }
}; 