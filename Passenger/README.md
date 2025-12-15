## WHERE I LEFT OFF 
- ride time estimate is still not working


## UI Updates:
- format the scheduled ride request for drivers. it's ugly
- tap to change photo for driver crashes the app
- driver image won't show up for passengers when ride is coming their way
- FORMAT THE STYLE SECTION FOR SEVERAL COMPONENTS
- passenger can't see the driver when the driver has arrived **IMPORTANT**

## Logic Updates:
- see if you can use address strings instead of coordinate points when clicking "navigate"
- Ride time for the ridecompleted page is innacurate. it shows the estimated ride time, but should show how long has passed since the ride began **IMPORTANT**
- filter pets
- make admin page to change pricing of rides
- If the passenger cancels a ride, change the driver's UI to show passenger canceled the ride. Vice-versa

## Future updates to features:
- Be able to edit profile 
- have wallet feature for passengers **IMPORTANT**
- make batch payment flow
- tip is showing up in the Connect account of the driver, but the fare share isn't **IMPORTANT**
- tipping page won't pop up for passenegers if the app refreshes. Make it so if the tip is false, they can't go to home screen?

## Fixed Updates:
- [FIXED]active ride screen for passenger can't scroll all the way down -> snappoints to 15%
- [FIXED]"fetch request timeout" when driver accepts a ride. the ride is running in the background -> changed timeout in fetch code to 20000
- [FIXED]active ride page for passenger has the back arrow and the location button too low (in RideLayout component)
- [FIXED]put back the map button to go to the back screen for passengers
- [FIXED]Alert for drivers for new ride shows a rideTime estimate, it's a random number I think 
- [FIXED?]eta for pick up and drop off should show what's in maps
- [FIXED]CHANGING USE PRICE CALCULATOR CHANGES RIDE TIME
- [FIXED]ETA of driver is currently a random number for the passenger
- [FIXED]eta once the ride has started on the passenger screen needs to be fixed to match actual google maps data
- [FIXED]passenger needs eta of driver and eta to get to destination
- [FIXED]active ride page for passenger doesn't show origin address -> destination address underneath "Active Ride"
- [FIXED]scheduled ride isn't in order for passenger. the label "wednesday" is getting cut off
- [FIXED]set up bank account button isn't working
- [FIXED]for driver app, remove the "setup required" in wallet once bank is set up
- [FIXED]buttons for different screens overflow words
- [FIXED]show banner to set up wallet before allowing drivers to be active
- [FIXED]the car icon on the map for the driver is ginormous, make it smaller
- [FIXED]scheduled ride accept button is crashing the app
- [FIXED]for testflight version, i am getting "missing required fields" status 400 when attempting to tip
- [FIXED]when a driver declines a ride, it doesn't go to the next driver.
- [FIXED]decline ride does't have logic to send to another open driver
- [FIXED]once driver has onboarded and completed profile, the action needed flag doesn't go away immediately. need refresh