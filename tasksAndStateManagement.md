# Making Tasks Our Users Don't Hate with Complex State Management

**_Staff is the most valuable company resource. They're also the most expensive. The balance between productivity and job satisfaction is a delicate one, and the fastest way to a good parity is with process buy-in. If the staff feels the processes & provided tools are helping them achieve their goals, they operate with an open mind._**

**_In a task-based system like a CRM, this buy-in is crucial. The quality of our insight is directly related to the data collected & input by the users. We want them happy, working toward company goals._**

**_Our system uses a one-click "Work" button to complete tasks. Once clicked, the system intelligently monitors the regular actions users take to see if their work completes the active task. This setup ensures the data integrity of the CRM & requires zero notes, no extra clicks & no separate action from the users._**

**_By getting out of the way of our users, we leave them with only the work at hand. In a one-click working environment, there's not much to not like._**

---

Everyone hates busywork. Unnecessary repetitive action is a morale killer for staff & eliminates time managers could be directing work toward higher return activity. My definition of busywork is anything a computer could do equally effectively.

The primary reduction of busywork in our system comes from our prospecting automation (discussed at length here), but what about all the other work? Perception is reality, and the team may perceive their tasks as busywork in spite of the automation performed on their behalf.

## The Work Button
Tasks are worthless if they are easily dismissed or never worked. Our enforcement for this is straightforward; the only way to clear a task is by clicking a "Work" button.

![](https://www.glathrop.com/content/images/2019/08/work-button-in-action.gif)

Watch as the user completes a RESPOND TO TEXT task:

- The user selects a task from the home page
- The user clicks a WORK button to let the system know they are working the chosen task.
- The system acknowledges this by turning the task green indicating a "Working" status.
- They take regular action to respond to the customer.
- The system monitors to see if the user action is valid for clearing the task. If so, it fires task completion data to the server.
- The server executes a task completion workflow which records activity, deletes the task & other associated processes.

![](https://www.glathrop.com/content/images/2019/08/Respond-to-Text-Task-Completion.gif)

The work button is deceptively simple. Quite a bit of functionality happens behind the scenes. For instance:

- Various tasks types are all handled by this one button.
- Users are automatically directed to different screens depending on the type of task
- The system watches for specific actions to check if the user performed the correct work for the task, & does not merely take the user's word the task is complete.
- The system requires no additional action by the user after clicking the work button.

## Task Prioritization
The best method we found for giving structure to the users is simple task prioritization. This concept is not revolutionary but very functional. Each task object contains a priority value from 1 - 100. Higher priority tasks appear at the top of all task lists.

The priority scale enables us to put tasks that require immediate attention front and center. These include:

- Manager message to a team member
- Incoming customer text/email
- New credit application received
- Inactive customer back on the retail website
- New Lead

![](https://www.glathrop.com/content/images/2019/08/new-tasks.gif)

The priority attribute gives the dev team an easy mechanism for incorporating user feedback. If the staff or management feels we are missing or undervaluing specific tasks, all we need to do is update the priority to place the task in a new order.

---
# Technical Summary

**Heavy use of the Redux store allows us to handle complex client-side operations with one button click & minimal code.**

---

Watch a user complete a Respond to Text task as you saw in the feature overview...

![](https://www.glathrop.com/content/images/2019/08/Respond-to-Text-Task-Completion.gif)

You can see how the Work button function by watching the pattern play out in the Redux store. The system uses the store to watch the actions a user is taking within the app & determine if they complete the selected task.

![](https://www.glathrop.com/content/images/2019/08/Respond-to-Text-Redux-Store.gif)


## How It Works
We use Redux actions to compose workflow flows in various ways throughout the app. We combine them in different ways to keep our code dry while handling multiple needs.

### Client Side

We take a simple button like this.
```jsx
<Button basic onClick={() => this.handleClick()}>
```

Then we bind a Redux action to the Button's ```handleClick``` method & pass in a selection of arguments from the Redux store. The handles array lets this pattern remain flexible throughout the app as different React components can be set to handle various task types.

```jsx
handleClick() {
    this.props.performTask({
      taskId: this.props.tasks.selectedTaskId,
      selectedTaskType: this.props.tasks.selectedTaskType,
      workingTask: this.props.tasks.workingTask,
      handles: ['prospect', 'review', 'inactivation', 'message','inventory', 'respond_to_text', 'respond_to_email'],
      customerId: this.props.customer.id
    });
  }
 ```
 
 #### Redux Action
 The ```performTask``` function is a Redux action we import into the component. The action itself evaluates the arguments to determine:

1. Is the user currently working a task?
2. Does the handles array contain the selectedTaskType?
3. If so, dispatch the completeTaskWorkflow action

```jsx
export function performTask(taskDetails) {
  return (dispatch) => {
    if (
      taskDetails.workingTask === true
      && _.includes(taskDetails.handles, taskDetails.selectedTaskType)) {
      dispatch(completeTaskWorkflow(taskDetails.taskId, taskDetails.customerId));
    } else {
      return {
        type: PERFORM_TASK,
        payload: taskDetails,
      };
    }
  };
}
```

The completeTaskWorkflow makes a post request to our server with information on the completed task. When we receive a success response, the function dispatches more Redux actions that show the user a Success notification & rehydrates the Redux store with the necessary, updated information. This pattern handles all client-side interaction.

```jsx
export function completeTaskWorkflow(taskId, customerId) {
  return (dispatch) => {
    dispatch({type: COMPLETE_TASK});
    const authToken = authService.getAccessToken();
    const request = axios({
      method: 'post',
      url: `${API_ROOT}/utility/api/tasks/delete_task/${taskId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    request.then(() => {
      const notification = {
        header: 'TASK COMPLETED!',
        type: 'success',
        content: 'The action you took completes the task you have selected to work.',
      };
      dispatch(showNotification(notification, 3000));
      dispatch(clearSelectedTask());
      dispatch(fetchCustomer(customerId));
    });
  };
}
```

## Server Side
Once the request hits our endpoint we pass the message through our microservices using the Seneca.js framework.

### Endpoint
```coffeescript
module.exports = (req, res) ->
  {task_id} = req.params
  {workflow} = req.body
  deleteOpts =
    role: 'task'
    cmd: 'delete_task'
    task_id: task_id
    workflow: workflow
  act deleteOpts
    .then (deleted_event)->
      res
        .status(204).end()
    .catch send_error res
 ```

The ```delete_task``` command is picked up by the appropriate microservice & executes a series of steps.

- Error checking
- Deleting the task from the database
- Pushing an update via Pusher.js to update any clients subscribed to the main task list feed

The net result is the task list updates automatically throughout the day without refreshing, preventing users from colliding, or selecting a non-existent task.   

### Keeping Code DRY

The interplay between Redux Action & React Component is very flexible.

For instance, sometimes, merely viewing a particular page should complete a task. In this case, we call performTask during the onComponentMount part of the React component lifecycle. If the user needs to take a deliberate action, then we include performTask as a prop or an event handler.

In either case, the ```handles``` array lets us control the tasks each component can complete individually.
