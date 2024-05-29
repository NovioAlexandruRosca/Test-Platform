document.addEventListener('DOMContentLoaded', async () => {
    const topicDropdown = document.getElementById('topicDropdown');
    const startTestBtn = document.getElementById('startTestBtn');
    const testCodeContainer = document.getElementById('testCodeContainer');
    const startActualTestBtn = document.getElementById('startActualTestBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    try {
        const response = await fetch('/topics');
        if (!response.ok) {
            throw new Error('Failed to fetch topics');
        }
        const topics = await response.json();
        topicDropdown.innerHTML = '';

        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            topicDropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching topics:', error.message);
        topicDropdown.innerHTML = '<option value="" disabled selected>Error fetching topics</option>';
    }

    startTestBtn.addEventListener('click', async () => {
        const title = document.getElementById('testTitle').value;
        const description = document.getElementById('testDescription').value;
        const topic = topicDropdown.value;

        fetch('/generate-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, topic })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to generate test');
            }
            return response.json();
        })
        .then(testCode => {
            console.log(testCode.code);
            testCodeContainer.textContent = `The test code is: ${testCode.code}`;
            startActualTestBtn.style.display = 'block';
            startActualTestBtn.dataset.code = testCode.code;
        })
        .catch(error => {
            console.error('Error generating test:', error.message);
        });
    });

    startActualTestBtn.addEventListener('click', async () => {
        const testCode = startActualTestBtn.dataset.code;

        fetch('/update-test-date', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: testCode })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update test date');
            }
            return response.json();
        })
        .then(data => {
            console.log(data.message);
        })
        .catch(error => {
            console.error('Error updating test date:', error.message);
        });
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
