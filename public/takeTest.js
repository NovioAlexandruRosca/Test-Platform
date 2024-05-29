let maxScore;
let creationDate;

document.addEventListener('DOMContentLoaded', async () => {
    
    const usernameElement = document.getElementById('title');

    try {
        const response = await fetch('/username');
        if (!response.ok) {
            throw new Error('Failed to fetch username');
        }
        const data = await response.json();
        const { username } = data;
        usernameElement.textContent = `Welcome, ${username}!`;
    } catch (error) {
        console.error('Error fetching username:', error.message);
        usernameElement.textContent = 'Welcome to the Test';
    }

    /////////////////////////////////////////////////////////////////////////

    const codeInput = document.getElementById('testCode');
    const modal = document.getElementById('myModal');
    const closeButton = document.getElementById('close');
    const submitButton = document.getElementById('startTestBtn');
    const errorElement = document.getElementById('errorElement');
    const logoutBtn = document.getElementById('logoutBtn');

    submitButton.addEventListener('click', async (event) => {

        event.preventDefault();

        const code = codeInput.value.trim();
        if (code) {
            try {
                const response = await fetch('/check-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ code })
                });
                if (!response.ok) {
                    throw new Error('Failed to check code');
                }
                const data = await response.json();
                if (data.isValid) {
                    const testId = data.testData;

                    fetchTestDetails(testId);
                    fetchQuestionsForTest(testId);

                    modal.style.display = 'block';
                } else {
                    errorElement.textContent = data.error || 'Invalid code';
                    setTimeout(() => {
                        errorElement.textContent = '';
                    }, 3000);
                }
            } catch (error) {
                console.error('Error checking code:', error);
                errorElement.textContent = 'Error checking code';
                setTimeout(() => {
                    errorElement.textContent = '';
                }, 3000);
            }
        } else {
            errorElement.textContent = 'Please enter a code.';
        }
    });

    logoutBtn.addEventListener('click', () => {
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to logout');
            }
            window.location.href = '/';
        })
        .catch(error => {
            console.error('Error logging out:', error.message);
        });
    });
});

function fetchQuestionsForTest(testId) {
    fetch(`/questions/${testId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch questions for test');
        }
        return response.json();
      })
      .then(questions => {
        console.log('Questions for test:', questions);
        
        const questionMap = {};

        questions.forEach(question => {
            maxScore = question.maxscore;
            if (!questionMap[question.questiontext]) {
              questionMap[question.questiontext] = [];
            }
            questionMap[question.questiontext].push({
              answer_id: question.answer_id,
              answertext: question.answertext,
              questionId: question.question_id
            });
          });

          for (const [questionText, answers] of Object.entries(questionMap)) {
            const questionContainer = document.createElement('div');
            questionContainer.classList.add('question');
      
            const questionTextElement = document.createElement('p');
            questionTextElement.textContent = questionText;
            questionContainer.appendChild(questionTextElement);
      
            answers.forEach(answer => {
                const answerLabel = document.createElement('label');
                
                const answerInput = document.createElement('input');
                answerInput.type = 'radio';
                answerInput.name = `answer_${questionText}`;
                answerInput.value = answer.answer_id;
                answerInput.id = `answer_${answer.answer_id}`;
                answerInput.setAttribute('questionId', answer.questionId);
                
                const labelText = document.createTextNode(answer.answertext);
                
                answerLabel.appendChild(answerInput);
                answerLabel.appendChild(labelText);
                
                questionContainer.appendChild(answerLabel);
            });
            
      
            const modalBody = document.getElementById('modal-body');
            modalBody.appendChild(questionContainer);
          }
      })
      .catch(error => {
        console.error('Error fetching questions for test:', error);
      });

  }

function fetchTestDetails(code) {
     fetch(`/test-details/${code}`)
        .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch test details');
        }
        return response.json();
        })
        .then(testDetails => {
        document.getElementById('testTitle').textContent = `Name: ` + testDetails.name;
        document.getElementById('testDescription').textContent = `Description: ` + testDetails.description;
        startCountdown(testDetails.creationDate);
        console.log('Test details:', testDetails);
        return testDetails;
        })
        .catch(error => {
        console.error('Error fetching test details:', error.message);
        return null; 
    });
}

function startCountdown(creationDate) {
    const countdownElement = document.getElementById('testTime');
    const submitButton = document.getElementById('submitTestBtn');
  
    const targetTime = new Date(creationDate);
    targetTime.setMinutes(targetTime.getMinutes() + 10);
  
    const countdownInterval = setInterval(updateCountdown, 1000);
  
    function updateCountdown() {
      const currentTime = new Date();
      const remainingTime = targetTime - currentTime;
  
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        countdownElement.textContent = 'Countdown expired';
        submitButton.click();
      } else {
        const minutes = Math.floor((remainingTime / 1000 / 60) % 60);
        const seconds = Math.floor((remainingTime / 1000) % 60);
  
        countdownElement.textContent = `Time remaining: ${minutes}m ${seconds}s`;
      }
    }
  
    updateCountdown();
  }


const submitButton = document.getElementById('submitTestBtn');

submitButton.addEventListener('click', async () => {
    try {

        const submittedAnswers = [];

        const questions = document.querySelectorAll('.question');
        questions.forEach(question => {
            const selectedInput = question.querySelector('input[type="radio"]:checked');
            const selectedAnswerId = selectedInput?.value || -1;
            const selectedInputt = question.querySelector('input[type="radio"]:checked');
            const questionId = selectedInputt ? selectedInputt.getAttribute('questionId') : null;


            if (questionId !== null && selectedAnswerId !== -1) {
                submittedAnswers.push({ questionId: questionId, answerId: selectedAnswerId });
            }
        });

        const response = await fetch('/submit-answers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submittedAnswers) 
        });

        if (!response.ok) {
            throw new Error('Failed to submit answers');
        }

        const result = await response.json();
        const modal = document.getElementById('myModal');
        modal.style.display = "none";
        document.getElementById('errorElement').textContent = `Your score is ${result}/${maxScore}`;
    } catch (error) {
        console.error('Error submitting answers:', error.message);
    }
});

  

const historyModal = document.getElementById("historyModal");
const historyButton = document.getElementById("History");


historyButton.addEventListener("click", function() {
  historyModal.style.display = "block";

  fetch('/testData')
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    console.log(data.testData);
    createTestEntities(data.testData);
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });

});

window.addEventListener("click", function(event) {
  const modalContent = document.querySelector('.modal-content');
  if (event.target === historyModal) {
    historyModal.style.display = "none";
    modalContent.innerHTML = '';
  }
});


function createTestEntities(testData) {
    const modalContent = document.querySelector('.modal-content');
    
    testData.forEach((test, index) => {
      const testEntity = document.createElement('div');
      testEntity.classList.add('test-entity');
  
      testEntity.id = `${test.id}`;

      const testName = document.createElement('h2');
      testName.id = `${test.id}-name`;
      testName.textContent = test.name;
      testEntity.appendChild(testName);
  
      const testDescription = document.createElement('p');
      testDescription.id = `${test.id}-description`;
      testDescription.textContent = `Description: ${test.description}`;
      testEntity.appendChild(testDescription);
  
      const testTopic = document.createElement('p');
      testTopic.id = `${test.id}-topic`;
      testTopic.textContent = `Topic: ${test.topic}`;
      testEntity.appendChild(testTopic);
  
      const testMaxScore = document.createElement('p');
      testMaxScore.id = `${test.id}-score`;
      testMaxScore.textContent = `Max Score: ${test.maxscore}`;
      testEntity.appendChild(testMaxScore);
  
      const testCreationDate = document.createElement('p');
      testCreationDate.id = `${test.id}-date`;
      const date = test.creationdate.substring(0, 10);
      testCreationDate.textContent = `Creation Date: ${date}`;
      testEntity.appendChild(testCreationDate);
  
      testEntity.addEventListener('click', () => {
        console.log(`Test ID: ${testEntity.id}`);
        modalContent.innerHTML = '';
        fetchTestInfo(testEntity.id, test.maxscore, test.name);
      });

      modalContent.appendChild(testEntity);
    });
  }


  function fetchTestInfo(testId, maxscore, name) {
  
    fetch(`/testInfo/${testId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((testDetails) => {
        console.log(testDetails.result.rows);
        console.log(testDetails.result1.rows);
        const answer = showAnswerRows(testDetails.result1.rows);
        showQuestionRows(testDetails.result.rows, maxscore, name, answer);
      })
      .catch((error) => {
        console.error("Error fetching test details:", error);
      });
  }

  function showQuestionRows(results, maxscore, name, answer) {
    let score = 0;
    const modalContent = document.querySelector('.modal-content');
  
    modalContent.innerHTML = ''; 
    

    answer.forEach((answerDetails, questionText) => {
        console.log(`Question Text: ${questionText}`);
        console.log(`- Answer Text: ${answerDetails.answertext}`);
        console.log(`- Answer ID: ${answerDetails.answerid}`);
      });
  
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = `Test: ${name}`;
    modalContent.appendChild(modalTitle);

    const maxScoreParagraph = document.createElement('p');
    modalContent.appendChild(maxScoreParagraph);

    const questionMap = new Map();
  
    results.forEach((result) => {
      if (!questionMap.has(result.questiontext)) {
        questionMap.set(result.questiontext, {
          score: result.score,
          answers: [],
        });
      }
      questionMap.get(result.questiontext).answers.push({
        answertext: result.answertext,
        is_correct: result.is_correct,
      });
    });
  
    questionMap.forEach((question, questionText) => {
      const questionContainer = document.createElement('div');
      questionContainer.classList.add('question-container');
  
      let correctQuestion;
      const answerObject = answer.get(questionText);
      let correctAnswer;

      if(answerObject){
        correctAnswer = answerObject.answertext;
        correctQuestion = true;
      }else{
        correctQuestion = false;
      }

      const questionTitle = document.createElement('p');
      questionTitle.textContent = questionText;
      questionContainer.appendChild(questionTitle);
  
      const questionScoreNumber = question.score;

      const questionScore = document.createElement('p');
      questionScore.textContent = `Score: ${question.score}`;
      questionContainer.appendChild(questionScore);
  
      const answerList = document.createElement('ul');
      answerList.classList.add('answer-list');
      questionContainer.appendChild(answerList);
  
      question.answers.forEach((answer) => {

        const answerItem = document.createElement('li');
        answerItem.textContent = answer.answertext;

        let answerChosen = false;

        if(correctAnswer == answer.answertext && correctQuestion){
            answerItem.textContent += " (You have chosen this one)";
            answerChosen = true;
        }

        if (answer.is_correct) {
            if(answerChosen){
                score += questionScoreNumber;
            }
            answerItem.classList.add('correct-answer');
        } else {
          answerItem.classList.add('wrong-answer');
        }
        answerList.appendChild(answerItem);
      });
  
      modalContent.appendChild(questionContainer);
    });

    maxScoreParagraph.textContent = `Score: ${score}/${maxscore}`;
  }

  function showAnswerRows(results){
    const answerMap = new Map();

    results.forEach((result) => {


      answerMap.set(result.questiontext, {
        answertext: result.answertext,
        answerid: result.answerid,
      });
    });
  
    return answerMap;
  }
