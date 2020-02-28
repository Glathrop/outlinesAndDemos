# Reducing Lost Customers With Automation
A little context....

**Implementing this workflow saved thousands of wasted employee hours and, due to the unified messaging, decreased our LOST customers from ~53% to ~33% of our outcomes, a 60% improvement. Each month, hundreds of additional customers move one step further in our conversion funnel.**

---

With the app launched, we quickly saw our most significant opportunity was to improve engagement with the 50+% of our customers classified as LOST.  Half our leads never engaged with us past submitting a lead or dropped contact during our 30-day prospecting cycle. Worse, our staff was spending a considerable portion of their day prospecting customers who would NEVER speak with us.


![](https://www.glathrop.com/content/images/2019/08/Screen-Shot-2019-08-06-at-1.44.05-PM.png)

Each sales team member attempted their approach with mixed results. Naturally, some phrasing or intros will work better than others, but a lousy text or email could give customers a reason to never engage with us.

I tried to dissect the problem. Once a customer engages, you can tailor your messaging to their individual needs, concerns, and abilities (ie - price focused, mileage focused, feature focused). However, until that point, you have no idea how what approach will work best. Therefore, messages can be generic ( and A/B tested!) until a customer engages. Once engaged, tailored communication is necessary.

The takeaway was clear. *Automate the prospecting of customers until they engage.* With automation, I saw an opportunity to reduce the percentage of LOST customers and, more importantly, eliminate the wasted time our team was spending on generic prospecting.

We used customer segmentation to get this done. First, we divided our customers into two groups:
- *Ghosts* - Customers who had never responded to a text, email, or answered a phone call.
- *Non-Ghosts* = Customers who had engaged with us.

Then we laid out a workflow to perform the automation:

- A cron grabs every active prospect attempt (*our system classification & DB record for an attempt to purchase a vehicle*).
- We send customers with active prospect attempts to a worker queue that determines if they are GHOSTS or not.
- We send GHOST customers to a second worker queue that performs various action.
- A switch case (code snippet in Technical Deep Dive) in the worker looks at how far a customer is into the prospecting cycle. Different days have different activity.
- Depending on the day, the system will text or email the customer a custom message or assign a task for a user to call.
- If the user has hit 31 days into the prospecting cycle and is still a GHOST, the system automatically marks them as LOST.

 ## Result
 
By using automation to provide consistent prospecting & messaging, we decreased our LOST customers from ~53% to ~33% of all outcomes. With an average of around 2100 leads monthly, this means ~420 more customers engage with us each month. Engagement after a the online activity is a crucial step in our sales funnel, so this is a material change.

![](https://www.glathrop.com/content/images/2019/08/Screen-Shot-2019-08-06-at-3.19.17-PM.png)

## Technical Summary
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
