# Reducing Lost Customers With Automation
A little context....
 
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
```when 7
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
    ch.ack(msg)```
