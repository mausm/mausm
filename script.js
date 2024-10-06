// used for checkin which tasks are on which date

const today = new Date();
const weekday = String(today.getDay());
const day = String(today.getDate()).padStart(2, '0'); // Get day and pad with zero if needed
const month = String(today.getMonth() + 1).padStart(2, '0'); // Get month (0-indexed) and pad with zero
const year = String(today.getFullYear());


function connect(callbackFunction) {
    // Open or create an IndexedDB
    const request = indexedDB.open('TasksDB', 1);
    
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        // Create an object store for form data with keyPath as id
        if (!db.objectStoreNames.contains('formData')) {
            db.createObjectStore('formData', { keyPath: 'id', autoIncrement: true });
        }
    };

    request.onsuccess = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('formData')) {
            console.error('No object in TasksDB with name formData, clear the index to resolve this issue');
            return;
        }
    
        callbackFunction(db);

        //loadEntries();
        console.log('Database opened successfully');

    };

    request.onerror = function(event) {
        console.error('Database error:', event.target.error);
    };
    

 }



// Load data from IndexedDB and display it in a list
function loadEntries() {

    connect(function onConnected(db) {
        const transaction = db.transaction('formData', 'readonly');
        const store = transaction.objectStore('formData');
        const requestAll = store.getAll();
    
        requestAll.onsuccess = function(event) {
            const result = event.target.result;
            const entriesList = document.getElementById('entriesList');
            entriesList.innerHTML = ''; // Clear existing entries
            let count = 0;
            if (result.length > 0) {
                result.forEach(entry => {
                    
                    // skip if already finished today for repeating tasks
                    if (entry.finishedDate == `${day}-${month}-${year}`) return;
                    
                    if (entry.executeDate && entry.executeDate != `${year}-${month}-${day}`) return;

                    // for days of the week tasks check the dat
                    if (entry.repeatDays && entry.repeatDays.length > 0 && entry.repeatDays.includes(weekday) == false)  return;

                    count++;
                    const entryDiv = document.createElement('div');
                    entryDiv.classList.add('entry');
    
                    entryDiv.innerHTML = `
                        <p>Taak: ${entry.task}</p>
                        <div>${entry.taskDescription}</div>
                        <button class="delete-button" onclick="completeTask(${entry.id})">Afronden</button>
                    `;
                    entriesList.appendChild(entryDiv);
                });
            } else {
                entriesList.innerHTML = '<p>Geen open taken.</p>';
            }
    
            if (count == 0) {
                entriesList.innerHTML = '<p>Geen open taken.</p>';
            }
    
        };
    
        transaction.onerror = function() {
            console.error('Transaction error:', transaction.error);
        };
    
      });

}

// Delete an entry from IndexedDB by ID
function completeTask(id) {

    connect(function onConnected(db) {

        const transaction = db.transaction('formData', 'readwrite');
        const store = transaction.objectStore('formData');

        // check if the task is recurring, then update the finished status. 
        // otherwise delete task
        const existingTask = store.get(id);

        existingTask.onsuccess = function(event) {
            const result = event.target.result;
                
            if (result.repeatDays.length > 0) {
                result.finishedDate = `${day}-${month}-${year}`;
                
                // store the updated finished date
                store.put(result).onsuccess = function() {
                    loadEntries();
                    showMessage('Taak opgeslagen')
                }           
            } else {
                const deleteRequest = store.delete(id);

                deleteRequest.onsuccess = function() {
                    showMessage('Taak afgerond')
                    loadEntries(); // Reload the entries after deletion
                };
                
                deleteRequest.onerror = function() {
                    console.error('Failed to delete entry:', deleteRequest.error);
                };

            }
        }
    });
}


function showMessage(message) {
    const messageBox = document.getElementById("messageBox");
    messageBox.style.display = "block";  // Show the message box
    
    messageBox.innerHTML = '<p>' + message + '</p>';

    setTimeout(() => {
      messageBox.style.display = "none"; 
    }, 1000);
  }