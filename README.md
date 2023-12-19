# Task Manager

## Overview

In this project, I created a site of task manager with the following functions:
<ul>
    <li>Display a list of tasks stored locally in the server and added by user, using a GET form
    <li>Filter tasks by title and/or tags
    <li>Sort tasks by due date or priority
    <li>Pin tasks that is marked pinned
    <li>Add tasks using a POST form
</ul>

The task should have the following fields:
<ul>
    <li>title: String, required field
    <li>description: String, can be multi-lined, optional field
    <li>priority: Number, should be an integer only, required field
    <li>due-date: String with Date format, required field
    <li>pinned: Boolean, required field
    <li>tags: List of Strings, optional field
    <li>progress: String, should be fixed contents, required field. An example: ["not-started", "in-progress", "done"]
</ul>