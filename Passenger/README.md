As I'm going: 
- [FIXED]Alert for drivers for new ride shows a rideTime estimate, it's a random number I think 
- [FIXED?]eta for pick up and drop off should show what's in maps
- [FIXED]CHANGING USE PRICE CALCULATOR CHANGES RIDE TIME. Right now, book-ride uses usepricecalculator (/lib/price) to set ride time, which then sends it to firebase through Payment. this shows up as the Ride Time in the banner
- [FIXED]ETA of driver is currently a random number for the passenger
- [FIXED]eta once the ride has started on the passenger screen needs to be fixed to match actual google maps data
- [FIXED]passenger needs eta of driver and eta to get to destination
- [FIXED]active ride page for passenger doesn't show origin address -> destination address underneath "Active Ride"


- tip is showing up in the Connect account of the driver, but the fare share isn't
- tipping page won't pop up for passenegers if the app refreshes. Make it so if the tip is false, they can't go to home screen?

- show banner to set up wallet before allowing drivers to be active
- for driver app, remove the "setup required" in wallet once bank is set up. maybe it's because of the test but it shows incomplete

- buttons for different screens overflow words
- put back the map button to go to the back screen for passengers
- tap to change photo for driver crashes the app

- filter pets

- when a driver declines a ride, it doesn't go to the next driver but shows "your ride was requested_pending_driver. please try requesting again" to the passenger
- decline ride does't have logic to send to another open driver

- make admin page to change pricing of rides

- scheduled ride isn't in order for passenger. the label "wednesday" is getting cut off

- CLEAN UP THE STYLE SECTION FOR RIDEREQUEST component on driver app and ACTIVERIDE on passenger. it's not formatted correctly
