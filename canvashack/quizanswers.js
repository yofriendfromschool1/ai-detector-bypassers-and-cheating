chrome.storage.local.get(['injectQuizAnswers', 'saveCorrectAnswers'], function(result) {
    const injectQuizAnswers = result.injectQuizAnswers;
    const saveCorrectAnswers = result.saveCorrectAnswers !== false; // Default to true if undefined

    if (injectQuizAnswers && saveCorrectAnswers) {
        loadQuiz();
    } else {
        console.log('Quiz Loader is disabled or Save Correct Answers feature is disabled.');
    }
});

function cleanRes(res) {
    return res.substring(9);
}

function getPointElements() {
    const pointHolders = document.getElementsByClassName('question_points_holder');
    let cleanPointHolders = [];

    for (let pointHolder of pointHolders) {
        const classList = pointHolder.parentElement.classList;
        for (let i = 0; i < classList.length; i++) {
            if (classList[i] == 'header') {
                cleanPointHolders.push(pointHolder);
                continue;
            }
        }
    }

    return cleanPointHolders;
}

function isIncorrectChoice(el) {
    return el.parentElement.nextElementSibling.className.includes('incorrect-answer');
}

function getQuestionIDs() {
    const questionIDs = [];
    const questionTextEls = document.getElementsByClassName('original_question_text');
    for (let el of questionTextEls) {
        questionIDs.push(el.nextElementSibling.id.split('_')[1]);
    }
    return questionIDs;
}

const QuestionTypes = {
    MULTIPLE_CHOICE: 'multiple_choice_question',
    TRUE_FALSE: 'true_false_question',
    FILL_IN_BLANK: 'short_answer_question',
    FILL_IN_M_BLANK: 'fill_in_multiple_blanks_question',
    MULTIPLE_ANSWER: 'multiple_answers_question',
    MULTIPLE_DROPDOWN: 'multiple_dropdowns_question',
    MATCHING: 'matching_question',
    NUMERICAL_ANSWER: 'numerical_question',
    FORMULA_QUESTION: 'calculated_question',
    ESSAY_QUESTION: 'essay_question'
};

async function getQuizSubmissions(courseID, quizID, baseURL) {
    const quizURL = `${baseURL}api/v1/courses/${courseID}/quizzes/${quizID}/`;
    const submissionsURL = quizURL + 'submissions';

    return await Promise.all([fetch(quizURL), fetch(submissionsURL)])
        .then(([resQuiz, resSubmissions]) => {
            return Promise.all([resQuiz.text(), resSubmissions.text()])
                .then(([resQuiz, resSubmissions]) => {
                    return [JSON.parse(resQuiz), JSON.parse(resSubmissions).quiz_submissions];
                });
        })
        .then(([resQuiz, resSubmissions]) => {
            const assignmentID = resQuiz.assignment_id;
            const userID = resSubmissions[resSubmissions.length - 1].user_id;

            if (!assignmentID) {
                throw new Error('Unable to retrieve assignmentID');
            } else if (!userID) {
                throw new Error('Unable to retrieve userID');
            }

            const submissionsHistoryURL = `${baseURL}api/v1/courses/${courseID}/assignments/${assignmentID}/submissions/${userID}?include[]=submission_history`;
            return fetch(submissionsHistoryURL);
        })
        .then((res) => {
            return res.text().then((res) => JSON.parse(res));
        })
        .then((res) => {
            return res.submission_history;
        });
}

function getCorrectAnswers(submissions) {
    let missingAnswers = {};
    let correctAnswers = {};
    let parsedSubmissions = {};
    let submission = restructureSubmission(submissions[0]);

    if (!submission) {
        return null;
    }

    for (let i = 0; i < submissions.length; i++) {
        submission = restructureSubmission(submissions[i]);
        for (let questionID in submission) {
            const question = submission[questionID];

            if (!(questionID in parsedSubmissions)) {
                parsedSubmissions[questionID] = {};
                parsedSubmissions[questionID]['attemptedAnswers'] = [];
                parsedSubmissions[questionID]['bestAttempt'] = question;
                parsedSubmissions[questionID]['latestAttempt'] = question;
            }

            if (parsedSubmissions[questionID].bestAttempt.correct == true) {
                continue;
            }

            if (question.correct == true) {
                parsedSubmissions[questionID].bestAttempt = question;
            } else if (parsedSubmissions[questionID].bestAttempt.points < question.points) {
                parsedSubmissions[questionID].bestAttempt = question;
            } else {
                parsedSubmissions[questionID].attemptedAnswers.push(question);
            }
        }
    }

    return parsedSubmissions;
}

function restructureSubmission(submission) {
    if (!submission.submission_data) {
        return null;
    }

    let restructuredSubmission = {};
    for (let question of submission.submission_data) {
        restructuredSubmission[question.question_id] = question;
    }
    return restructuredSubmission;
}

function display(answers) {
    const questions = document.getElementsByClassName('question');
    const questionTypes = document.getElementsByClassName('question_type');
    const numQuestions = questions.length;
    const displayer = new Displayer();
    const pointHolders = getPointElements();
    const questionIDs = getQuestionIDs();

    let autoFilledQuestions = {};

    for (let i = 0; i < numQuestions; i++) {
        const questionType = questionTypes[i].innerText;
        const questionID = questionIDs[i];

        if (answers[questionID]) {
            const answer = answers[questionID].bestAttempt;
            answer['attemptedAnswers'] = [];
            for (let attemptedAnswer of answers[questionID].attemptedAnswers) {
                if (attemptedAnswer.text != '') {
                    answer.attemptedAnswers.push(attemptedAnswer.text);
                }
            }

            const questionElement = questions[i];
            const pointHolder = pointHolders[i];

            const originalPointText = pointHolder.innerText;

            autoFilledQuestions[questionID] = false;

            questionElement.addEventListener('mouseenter', function () {
                if (!autoFilledQuestions[questionID]) {
                    displayer.displayAnswer(questionType, answer, questionID);
                    autoFilledQuestions[questionID] = true; // Mark as auto-filled
                }

                // Show updated point holder text when hovered
                const earnedPoints = Math.round(answer.points * 100) / 100;
                if (earnedPoints == parseFloat(originalPointText)) {
                    pointHolder.classList.add('correct-answer');
                } else {
                    pointHolder.classList.add('incorrect-answer');
                }
                pointHolder.innerText = `${earnedPoints} out of ${originalPointText}`;
            });

            questionElement.addEventListener('mouseleave', function () {
                // Do not clear the answer to allow user modifications
                // Revert point holder text to the original when not hovered
                pointHolder.innerText = originalPointText;
                pointHolder.classList.remove('correct-answer', 'incorrect-answer');
            });
        } else {
            // For questions without previous answers
            const pointHolder = pointHolders[i];
            const originalPointText = pointHolder.innerText;

            questions[i].addEventListener('mouseenter', function () {
                pointHolder.innerText = `(New Question) ${originalPointText}`;
            });

            questions[i].addEventListener('mouseleave', function () {
                pointHolder.innerText = originalPointText;
            });
        }
    }
}

class Displayer {
    displayAnswer(questionType, answer, questionID) {
        switch (questionType) {
            case QuestionTypes.ESSAY_QUESTION:
                this.displayEssay(answer, questionID);
                break;
            case QuestionTypes.MATCHING:
                this.displayMatching(answer, questionID);
                break;
            case QuestionTypes.MULTIPLE_ANSWER:
                this.displayMultipleAnswer(answer, questionID);
                break;
            case QuestionTypes.MULTIPLE_CHOICE:
            case QuestionTypes.TRUE_FALSE:
                this.displayMultipleChoice(answer, questionID);
                break;
            case QuestionTypes.FILL_IN_BLANK:
            case QuestionTypes.FORMULA_QUESTION:
            case QuestionTypes.NUMERICAL_ANSWER:
                this.displayFillInBlank(answer, questionID);
                break;
            case QuestionTypes.FILL_IN_M_BLANK:
                this.displayFillInMultipleBlank(answer, questionID);
                break;
        }
    }

    displayMatching(answer, questionID) {
        if (!answer) {
            return;
        }

        for (let answerProperty in answer) {
            if (answerProperty.includes('answer_')) {
                const answerID = `question_${questionID}_${answerProperty}`;
                const element = document.getElementById(answerID);
                if (element && !element.dataset.userModified) {
                    element.value = answer[answerProperty];
                    // Mark as auto-filled
                    element.dataset.autoFilled = true;
                    // Add event listener to detect user modification
                    element.addEventListener('input', function () {
                        element.dataset.userModified = true;
                    });
                }
            }
        }
    }

    displayMultipleAnswer(answer, questionID) {
        if (!answer) {
            return;
        }

        for (let answerProperty in answer) {
            if (answerProperty.includes('answer_')) {
                const answerID = `question_${questionID}_${answerProperty}`;
                const element = document.getElementById(answerID);
                if (element && !element.dataset.userModified) {
                    element.checked = parseInt(answer[answerProperty]);
                    // Mark as auto-filled
                    element.dataset.autoFilled = true;
                    // Add event listener to detect user modification
                    element.addEventListener('change', function () {
                        element.dataset.userModified = true;
                    });
                }
            }
        }
    }

    displayMultipleChoice(answer, questionID) {
        if (!answer) {
            return;
        }

        if ('attemptedAnswers' in answer && answer.attemptedAnswers.length) {
            for (let answerID of answer.attemptedAnswers) {
                const answerIDStr = `question_${questionID}_answer_${answerID}`;
                const el = document.getElementById(answerIDStr);
                if (el && el.parentElement.nextElementSibling) {
                    el.parentElement.nextElementSibling.className += ' incorrect-answer';
                }
            }
        }

        if (!('answer_id' in answer)) {
            return;
        }

        const answerID = `question_${questionID}_answer_${answer.answer_id}`;
        const el = document.getElementById(answerID);

        if (!el || el.dataset.userModified) {
            return;
        }

        if (!isIncorrectChoice(el)) {
            el.checked = true;
            // Mark as auto-filled
            el.dataset.autoFilled = true;
            // Add event listener to detect user modification
            el.addEventListener('change', function () {
                el.dataset.userModified = true;
            });
        }
    }

    displayFillInBlank(answer, questionID) {
        if (!answer) {
            return;
        }

        let element = null;
        const elements = document.getElementsByName(`question_${questionID}`);
        for (let el of elements) {
            if (el.tagName === 'INPUT' && !el.dataset.userModified) {
                element = el;
                break;
            }
        }

        if (element) {
            element.value = answer.text;
            // Mark as auto-filled
            element.dataset.autoFilled = true;
            // Add event listener to detect user modification
            element.addEventListener('input', function () {
                element.dataset.userModified = true;
            });
        }
    }

    displayEssay(answer, questionID) {
        if (!answer) {
            return;
        }

        let topParent;
        setTimeout(() => {
            try {
                topParent = document.getElementById(`question_${questionID}_question_text`);
                const parent =
                    topParent.nextElementSibling.firstElementChild.children[2]
                        .firstElementChild.firstElementChild.children[1].firstElementChild;
                const iframe = parent.contentDocument
                    ? parent.contentDocument
                    : parent.contentWindow.document;
                const editor = iframe.getElementById('tinymce');
                if (editor && !editor.dataset.userModified) {
                    editor.innerHTML = answer.text;
                    // Mark as auto-filled
                    editor.dataset.autoFilled = true;
                    // Add event listener to detect user modification
                    editor.addEventListener('input', function () {
                        editor.dataset.userModified = true;
                    });
                }
            } catch (e) {
                topParent.innerHTML += `<p>${answer.text}</p>`;
            }
        }, 500);
    }

    displayFillInMultipleBlank(answer, questionID) {
        if (!answer) {
            return;
        }

        const topParent = document.getElementById(`question_${questionID}_question_text`);
        const inputs = topParent.querySelectorAll('input');
        const answerKeys = Object.keys(answer).filter((key) => key.includes('answer_for'));

        if (answerKeys.length != inputs.length) return;

        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            if (!input.dataset.userModified) {
                input.value = answer[answerKeys[i]];
                // Mark as auto-filled
                input.dataset.autoFilled = true;
                // Add event listener to detect user modification
                input.addEventListener('input', function () {
                    input.dataset.userModified = true;
                });
            }
        }
    }
}

// quiz_loader.js
async function loadQuiz() {
    const currentURL = window.location.href;
    const courseID = currentURL.split('courses/')[1].split('/')[0];
    const quizID = currentURL.split('quizzes/')[1].split('/')[0];
    const splittedURL = currentURL.split('/');
    const baseURL = `${splittedURL[0]}//${splittedURL[2]}/`;

    if (!courseID || !parseInt(courseID)) {
        console.error('Unable to retrieve course id');
    } else if (!quizID || !parseInt(quizID)) {
        console.error('Unable to retrieve quiz id');
    }

    const submissions = await getQuizSubmissions(courseID, quizID, baseURL);
    const correctAnswers = getCorrectAnswers(submissions);

    if (!correctAnswers) {
        return null;
    }

    display(correctAnswers);
}