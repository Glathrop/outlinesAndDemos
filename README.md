# Reducing Lost Customers With Automation
A little context....

**Implementing this workflow saved thousands of wasted employee hours and, due to the unified messaging, decreased our LOST customers from ~53% to ~33% of our outcomes, a 60% improvement. Each month, hundreds of additional customers move one step further in our conversion funnel.**
---

 
A cron job identifies customers who have not engaged with us beyond browsing on the website then sends their information to a long-running worker queue for evaluation. The queue looks at the length of time since the customer entered our system and mimics the best-practices a user performs when prospecting leads.

All communication from the system comes from "Michelle," so staff can easily see who did what.

## Goals
We want the system to reach out with a series of general prospecting messages at different points in time. Both the message & the message timing should be easily changeable.

## Automation
Each business day, we run a cron to gather all "ghost" customers (customers who haven't spoken with us yet) with an active prospect attempt.

Next, we send each result to a worker queue.

The queue uses a switch case to evaluate a parameter named days_since_inbound. For a ghost customer, this parameter will go up until the customer engages with us via phone, text, or email.

When the switch statement evaluates to true, we can choose between five options

- Create Task
- Inactivate Customer
- Send Email
- Sent Text
- Do nothing & ack the message.

The code looks like this... 
```coffeescript
 when 7
    task =
      assignment: {
        primary_role: 'BDC Rep'
        location: 'Garland'
        department: 'Sales'
      }
      name: "Prospect +7 Ghost"
      priority: 50
      type: 'prospect'
    _create_task(ghost, task)
    ch.ack(msg)
  when 8
    ch.ack(msg)
  when 9
    ch.ack(msg)
  when 10
    #  Quick yes or no
    _send_text(ghost,'ghosts', 10)
    _send_email(ghost, 'ghosts', 10)
    ch.ack(msg)
```

The send_text & send_email use a helper function named select_template to generate the message itself.

```coffeescript
_select_template = require './_select_sms_template'
```

select_template takes in the group ('ghosts' in this case), the day the action occurs & any necessary data.

```coffeescript
  template = _select_template(group, day, data)
```
In the select_template file, we import each template separately, and another switch case generates the template body complete with any template string insertion.

```coffeescript
ghost01 = require "../templates/ghosts/sms/day01"
ghost02 = require "../templates/ghosts/sms/day02"

module.exports = (group, day, data) ->
  if group is 'ghosts'
    template = ''
    switch (day)
      when 1
        # Questions About Inventory or Financing?
        template = ghost01(data)
      when 2
        # What Kind of Vehicle?
        template = ghost02(data)
```

The message itself looks like:

```coffeescript
module.exports = (data) ->
  data =
    body: "Hi #{data.name.first_name},\n
    \nHave you had any luck finding the vehicle you were searching for?\n
    \n-Michelle\n
    \nVP Auto Sales\n
    \nhttps://vp3.link/site"
 ```
 
 Once generated, we return the template to send_text or send_email, which handles the act of sending the message.

This setup allows us to easily change the template or which day to send the message. Many server workflows, like task generation, use this flexible pattern.
