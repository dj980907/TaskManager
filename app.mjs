// app.mjs
import express from 'express';
import {resolve, dirname} from 'path';
import {readFile, readdir} from 'fs';
import {fileURLToPath} from 'url';
import {Task} from './task.mjs';

const app = express();

// set hbs engine
app.set('view engine', 'hbs');

const basePath = dirname(fileURLToPath(import.meta.url));
const publicPath = resolve(basePath, "public");

// activate the middleware by using that directory combined with public
app.use(express.static(publicPath));

// middleware that can access the content of the body
app.use(express.urlencoded({ extended: true }));

// custom middleware that prints out the logging
app.use((req, res, next) => {
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  next();
});

// The global list to store all tasks to be rendered
const taskList = [];

// The reading path
const readingPath = resolve(basePath, './saved-tasks');

/**
 * This function sort tasks by the give criteria "sort-by" and "sort-order"
 * @param {Request} req query should contain "sort-by" and "sort-order"
 * @param {[Task]} l the array of tasks to be sorted
 * @return {[Task]} sorted array of tasks by the given criteria
 */

function sortTasks(req, l) {
  if (req.query['sort-by'] && req.query['sort-order']) {
    const newL = [...l];
    const crit = req.query['sort-by'];
    const ord = req.query['sort-order'];

    // Sort by pinned status first (pinned tasks at the top)
    newL.sort((a, b) => {
      if (a.pinned && !b.pinned) {
        return -1;
      } 
      else if (!a.pinned && b.pinned) {
        return 1;
      } 
      else if (ord === 'asc') {
        // If both are pinned or both are not, proceed with regular sorting
        switch (crit) {
          case 'due-date': {
            const a1 = new Date(a['dueDate']);
            const b1 = new Date(b['dueDate']);
            if (a1 === b1){
              return 0;
            } 
            return a1 > b1 ? 1 : -1;
          }
          case 'priority': {
            return a[crit] - b[crit];
          }
          default: {
            return 0;
          }
        }
      } 
      else if (ord === 'desc') {
        switch (crit) {
          case 'due-date': {
            const a1 = new Date(a['dueDate']);
            const b1 = new Date(b['dueDate']);
            if (a1 === b1) {
              return 0;
            }
            return a1 < b1 ? 1 : -1;
          }
          case 'priority': {
            return b[crit] - a[crit];
          }
          default: {
            return 0;
          }
        }
      } 
      else {
        return 0;
      }
    });

    return newL;
  } 
  else {
    return l;
  }
}


/**
 * This function sort tasks by whether they are pinned or not
 * @param {[Task]} l the array of tasks to be sorted
 * @return {[Task]} sorted array of tasks, with pinned tasks first
 */
function sortTasksByPinned(tasks) {
  // First, we split the array into two separate arrays: pinned tasks and unpinned tasks
  const pinnedTasks = tasks.filter(task => task.pinned);
  const unpinnedTasks = tasks.filter(task => !task.pinned);

  // Then, we concatenate the pinned tasks array with the unpinned tasks array
  // Pinned tasks will appear at the front of the array, followed by unpinned tasks
  const sortedTasks = [...pinnedTasks, ...unpinnedTasks];

  return sortedTasks;
}



// Function to read tasks from files and store them in memory
function readTasksFromFiles() {
  // const taskDirectory = './saved-tasks';

  // Read the directory to get a list of task files
  readdir(readingPath, (err, files) => {
    if (err) {
      console.error('Error reading task directory:', err);
      return;
    }

    // Loop through each file and read its contents
    files.forEach((file) => {
      const filePath = `${readingPath}/${file}`;

      // Read the file asynchronously
      readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading task file:', err);
          return;
        }

        try {
          const taskData = JSON.parse(data);
          // console.log("this is taskData:", taskData);
          const task = new Task(taskData);
          taskList.push(task);
        } catch (parseError) {
          console.error('Error parsing task data:', parseError);
        }
      });
    });
  });
}

// make the app listen
app.listen(3000);

// read tasks from the files
readTasksFromFiles();

// when the user is at the home page
app.get('/', (req, res) => {

  // make a copy of the original array
  let filteredTasks = [...taskList];

  // sort the task by whether it is pinned or not
  filteredTasks = sortTasksByPinned(filteredTasks);

  // Filter tasks by tag if a tag is provided in the query
  if (req.query.tag) {
    // Convert to lowercase for case-insensitive search
    const tagToSearch = req.query.tag.toLowerCase(); 
    // filter the task
    filteredTasks = filteredTasks.filter(task => task.tags.some(tag => tag.toLowerCase().includes(tagToSearch)));
    // sort the array by whether it is pinned or not
    filteredTasks = sortTasksByPinned(filteredTasks);
  }

  // Filter tasks by title if a title is provided in the query
  if (req.query.title) {
    // Convert to lowercase for case-insensitive search
    const titleToSearch = req.query.title.toLowerCase(); 
    // filter the tasks by the title
    filteredTasks = filteredTasks.filter(task => task.title.toLowerCase().includes(titleToSearch));
    // sort the array by whether it is pinned or not
    filteredTasks = sortTasksByPinned(filteredTasks);
  }

  // sorting the tasks by due_date or priority
  if (req.query['sort-by'] && req.query['sort-order']) {
    filteredTasks = sortTasks(req, filteredTasks);
  }

  // render a home template with filtered Tasks
  res.render('home', { layout: 'layout', taskList: filteredTasks });
});

// when the user goes to the add page
app.get('/add', (req, res) => {
  // render the add template
  res.render('add', {layout: 'layout'});
});

// when the user submit a form
app.post('/add', (req, res) => {
  // Parse the form data to get task properties
  const { title, description, priority, dueDate, pinned, tags, progress } = req.body;

  // Create an object that will be passed in as a parameter for the constructor
  const task = {
    title,
    description,
    priority: parseInt(priority),
    'due-date': dueDate,
    pinned: Boolean(pinned).valueOf(), 
    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    progress,
  };

  // create a new task
  const newTask = new Task(task);

  // Add the new task to the taskList
  if (newTask.pinned) {
    // If the task is pinned, add it to the beginning of the list
    taskList.unshift(newTask);
  } else {
    taskList.push(newTask);
  }

  // Redirect to the home/main page to display the updated list of tasks
  res.redirect('/');
});
