TODO

The slot selector in the left nav bar should not be duplicated like it currently ys

On the interative map route, we shoudl use different ui elements for the switcher bweteen the maps and the preset options like Discovered and undiscovered graces.

We should probably implement a simple layer like system on the map route below the map component that would allow us to hide (but not clear) 3 different layers of content: graces, bosses, items.

The discovered graces should have a different shade of yellow than undiscovered graces.
Same for bosses but with red.

We should limit how for the leaflet map can be zoomed out, it goes too far out.

There should be a button to center the map on the players location at a specific zoom level.

We should also render the players dropped graces if they have died without picking them up, the hover on that pin should show how many are on the ground. (this is the souls memory field I believe)

The footer is pretty tall, I think we should try to shorten it. Not sure if we need the view on github button in both the side bar and on the footer.


We should look at the premade shadcn sidebar blocks, they have two things we miht want to take.
On the shadcn sidebar, I know there is a premade like organiztion switcher, we could probably reuse most of that for the slot selector.

I do not see a filter or column in the armaments table for if the item is owned or not? Thought that was once there.


On the events data table, we have event types for maps, wetblades, cookbooks. I know we probably made this different because that show up different in the save file, but to the user those are just items. So we should probably put them with the other itemm tables like armaments and armor... etc


Not sure if I would like this but I think it might be cook to split up the different tables in the inventory route into different routes. We can looks to see if shadcn has a sample side bar with nested routes.


I hate that all the data tables are paginated with only like 10 items rendering at once, we should probably implement tanstack virtual to do virtualized scrolling. I know that tanstack table or vitual has usage examples of combining tanstack table and virtual, (we should clone them to docs/cloned-repos-as-docs/ and look at the examples there). The data tables should just take up max height they can probably



All the stuff that once was in the app bar has moved to the sidebar except the darkmode toggle. Maybe we should just move it to the side bar too.

The overview route still has an empty avatar circle, I know prod had this too it was temporary. we should do something better.

On the bosses screen, I do not know if we are being accurate on which bosses we are calling demigods and which we are not. We should check the wikis to be sure. Also need to add dlc bosses there. And if a boss is not defeted, (or if it is) I think there should be some way to click on the boss card to have its location on the map. Also some of the big map icons still do not have images. I think this is because we are using the remembreance icons and some of them do not drop remembrance items (so they do not have an icon to use).

In the bosses data table, we have a column called map, which has entries like m10_00_00_00. That means nothing to the user. We should probably show the map name instead. Maybe we should have a column for the number of runs they will drop or the item or something like that (not firm on those)

We have an opensource pill thing in the footer and also a view on github button, we do not need both.


I know that we have the "Copy Save as JSON" button because at one point in time a user asked for it but I do not know if thats the best place for it. We can probably think of something better.

The website does not have a favicon, we should add one.

we should make sure the website has good opengraph stuff so if its like shared in discord or slack it shows up well.

The acknowledgment page is missing a lot of projects that we took inspiration from and does not correctly list how we are using them. We used erdb for the first iteration of the site but since then we have completely switched off because it did not support dlc data. We now have kinda built our own extractor to take its place. docs\cloned-repos-as-docs\er-save-manager this is not even listed. We should go through all the docs\cloned-repos-as-docs\dlc-data-sources that we ended up using or reading for inspiration and add them to the acknowledgment page.

I think the overview page should probably have a breakdown of like what percent of weapons you have collected, what percent of armor, whatever. People will probably want to use that as like a way to see overall game completion at a high level and Items Collected
463 / 5709
across 19 inventory types does nto tell you a whole lot.

On the calcultor page we have a card for "Plan a Build" that looks like you might interact with it, idk kinda confusing. And the reset button stays clickable looking even when you have not interacted with it.

The calculator does not render weapon icons in the data table, we should add that.

We should probably make the side bar collapsable like the sidebar in the shadcn docs.

On the bosses page when you hover a boss and the tooltip appears, the tool tip content background is white even on the dark theme. This does not look good.

In the footer we have a button for github stars, that button should have the number of stars as the text.

# Stuff we should probably make seperate projects for

I would like to have like a sharing feature so that one user could share their stuff with a different user. The best way to do this is if we could encode the entire save file in the query params. We need to know how big the extracted part of the save file is and how ling wuery params could be. We could potentially compress it first to make this work.

It would be pretty cool if we could make our extractor extract like the 3d models of weapons and armor and we could like use threejs to render the characters current equipped gear.

I think the whole calculator page needs to be reworked, the user should be pick an option for like "I want to play a strength build, dex build, arcane build.. etc" and we should be able to tell them what is the best item in the inventory that matches their play style, which one does the most damage based on their stats, where they should place exp point the next time they level up, what weapons would be good to move to once hitting a certain level, etc... I think we need to explore the wiki a lot more and read about different build and possible like weapon tier lists to really make this good. Maybe we want calculators for different things. I could also see like a calculator that recommends when to respec your character if you are very badly specced, or want to change your build.  


I think it would be cool if there was a section on the map route or maybe even a new route that like showed the player what weapons and items are near their save location at any given time. Like if the player has the http server serving their save they could keep this website open in a browser tab and everytime they save they could glance over and make sure they are not missing any items. before moving onto the next area.

In the version of the website currently on prod all table filters, sorts, and even map pans and zooms were stored in a persisted zustland store. This meant if the user refreshed the page was the same. I know we replaced zustland for effect-atom but I think effect-atom can still do persisted state in localstorage just like zustland. we should definetly set that up.

We should make the website mobile friendly, definetly a new project doc should be made in docs/projects/future/mobile-friendly.md for this for manual verification.

