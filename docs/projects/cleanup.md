TODO

[DONE 2026-06-06] The slot selector in the left nav bar should not be duplicated like it currently ys (the avatar block + slot-selector combobox both showed the character name; merged into one `SlotSwitcher` — avatar + name + archetype/level that IS the slot dropdown, per the shadcn team-switcher)

[DONE 2026-06-06] On the interative map route, we shoudl use different ui elements for the switcher bweteen the maps and the preset options like Discovered and undiscovered graces. (under-map controls regrouped into labeled clusters: Map = segmented control, Layers = Switch toggles, Quick select = labeled preset buttons. Also: removed Calibrate button + the info tooltip, added a bottom-right zoom/center readout, finer 0.25 zoom increments, and x,y coords in every pin popup.)

[DONE 2026-06-06] We should probably implement a simple layer like system on the map route below the map component that would allow us to hide (but not clear) 3 different layers of content: graces, bosses, items. (now shadcn Switch toggles)

[DONE 2026-06-06] The discovered graces should have a different shade of yellow than undiscovered graces.
Same for bosses but with red. (graces: found=bright gold / undiscovered=muted; bosses: defeated=bright red / remaining=muted; legend updated)

[DONE 2026-06-06] We should limit how for the leaflet map can be zoomed out, it goes too far out. (minZoom clamped to the whole-map-fits zoom, recomputed on resize so it actually sticks even if the container is unsized on first render)

[DONE 2026-06-06] There should be a button to center the map on the players location at a specific zoom level. ("Center on me" button; switches realm if needed. Disabled only when (a) no save is connected or (b) the character is in an interior/dungeon we can't project onto the overworld tile map — title text now says which; the player IS always on some map, but we only render overworld masters M00/M10, not legacy-dungeon interiors.)

[DONE 2026-06-06] We should also render the players dropped graces if they have died without picking them up, the hover on that pin should show how many are on the ground. (this is the souls memory field I believe) (the save already parses `blood_stain` = {coords, map_id, runes}; added a `useBloodstainPin` + a distinct glowing-gold-diamond marker. Hover tooltip shows "N runes on the ground"; click popup shows the count + x,y. Two states: `runes > 0` = active "Lost runes" (bright filled diamond); `runes <= 0` = a faded hollow "Last death · runes recovered" diamond — see the runes-sentinel note below. Reuses `playerToMasterPixel`, so it projects through legacy dungeons too.)

[DONE 2026-06-06] The footer is pretty tall, I think we should try to shorten it. Not sure if we need the view on github button in both the side bar and on the footer. (shortened; removed the footer's View-on-GitHub button since the sidebar has one)


We should look at the premade shadcn sidebar blocks, they have two things we miht want to take.
[DONE 2026-06-06] On the shadcn sidebar, I know there is a premade like organiztion switcher, we could probably reuse most of that for the slot selector. (built `SlotSwitcher` from the cloned sidebar-07 team-switcher pattern at docs/cloned-repos-as-docs/ui — the OTHER thing to take, the collapsible sidebar, is still TODO; see the "make the side bar collapsable" item)

[DEFERRED 2026-06-06] I do not see a filter or column in the armaments table for if the item is owned or not? Thought that was once there. (the inventory Armaments table's "Quantity" column IS the ownership indicator — `quantity > 0` = owned, and weapons append ` +N` upgrade level; `main` only had Quantity too, no separate Owned column. An explicit boolean "Owned" column would also auto-add an Owned True/False faceted filter — one line in `defaultColumns` (inventory-data-table-card.tsx) — but deferring per request. NOTE: the standalone "Weapons" browser is save-independent and intentionally has no ownership.)


[DONE 2026-06-06] On the events data table, we have event types for maps, wetblades, cookbooks. I know we probably made this different because that show up different in the save file, but to the user those are just items. So we should probably put them with the other itemm tables like armaments and armor... etc (maps/whetblades/cookbooks were already `category: "Key Item"` in GOODS, so they already lived in the inventory tables — the events table was duplicating them. Removed `map`/`cookbook`/`whetblade` from `vm/events.ts` (now grace+boss only, card renamed "World Progress"). While here, also reorganized the inventory tables to mirror Elden Ring's own inventory tabs (the 19 dataset-native categories → 13 in-game tabs): merged Sorceries+Incantations → "Spells"; folded Consumables/Physick/Crystal Tears/Crafting Tools/Cookbooks → "Tools"; folded Remembrances/Great Runes into "Key Items"; renamed Upgrade Materials → "Bolstering Materials" and Armaments → "Weapons & Shields". Spirit Ashes keeps its own tab (game files it under Tools as "Summons", but its enriched HP/FP/summon columns warrant a dedicated table). Added a Category column to the merged Spells/Tools/Key Items tables so sub-types stay distinguishable. CAVEAT / needs a manual eyeball when the app is next run: the **Tools** tab is now large — it unions Consumables + Crystal Tears + Wondrous Physick + Crafting Tools + Cookbooks into one list. The new Category column + its facet filter should keep it navigable, but if it feels unwieldy in practice that argues for the granular-grouping alternative instead (keep the 19 dataset-native tables but just regroup/relabel the category-picker groups to mirror the in-game tabs — no table merging, nothing folded away).)


Not sure if I would like this but I think it might be cook to split up the different tables in the inventory route into different routes. We can looks to see if shadcn has a sample side bar with nested routes.


I hate that all the data tables are paginated with only like 10 items rendering at once, we should probably implement tanstack virtual to do virtualized scrolling. I know that tanstack table or vitual has usage examples of combining tanstack table and virtual, (we should clone them to docs/cloned-repos-as-docs/ and look at the examples there). The data tables should just take up max height they can probably



[DONE 2026-06-06] All the stuff that once was in the app bar has moved to the sidebar except the darkmode toggle. Maybe we should just move it to the side bar too. (moved to the sidebar brand header; still surfaced in the mobile top bar where the sidebar is hidden)

The overview route still has an empty avatar circle, I know prod had this too it was temporary. we should do something better.

On the bosses screen, I do not know if we are being accurate on which bosses we are calling demigods and which we are not. We should check the wikis to be sure. Also need to add dlc bosses there. And if a boss is not defeted, (or if it is) I think there should be some way to click on the boss card to have its location on the map. Also some of the big map icons still do not have images. I think this is because we are using the remembreance icons and some of them do not drop remembrance items (so they do not have an icon to use).

In the bosses data table, we have a column called map, which has entries like m10_00_00_00. That means nothing to the user. We should probably show the map name instead. Maybe we should have a column for the number of runs they will drop or the item or something like that (not firm on those)

[DONE 2026-06-06] We have an opensource pill thing in the footer and also a view on github button, we do not need both. (removed the "Open source" pill and the View-on-GitHub button)


I know that we have the "Copy Save as JSON" button because at one point in time a user asked for it but I do not know if thats the best place for it. We can probably think of something better.

[DONE 2026-06-06] The website does not have a favicon, we should add one. (favicon.svg given explicit colors + a dark tile and wired into the document head — it existed but was never linked, and used currentColor so it was invisible)

[PARTIAL 2026-06-06] we should make sure the website has good opengraph stuff so if its like shared in discord or slack it shows up well. (added og:/twitter: title+description+url + favicon as og:image; a proper 1200×630 raster OG card is still TODO — SVG og:image won't render on most platforms)

[DONE 2026-06-06] The acknowledgment page is missing a lot of projects that we took inspiration from and does not correctly list how we are using them. We used erdb for the first iteration of the site but since then we have completely switched off because it did not support dlc data. We now have kinda built our own extractor to take its place. docs\cloned-repos-as-docs\er-save-manager this is not even listed. We should go through all the docs\cloned-repos-as-docs\dlc-data-sources that we ended up using or reading for inspiration and add them to the acknowledgment page. (rewrote `credits-section.tsx` into 4 groups — Game data & catalogue / Save files & reverse engineering / Extraction & game formats / References & community — sourcing accurate per-project roles from `packages/vendored-data/README.md`. ERDB demoted to "powered v1, replaced by our own extractor for DLC support". Added 9 missing projects: ER-Save-Lib, er-save-manager, soulstruct's EMEVD role, UXM Selective Unpacker, SoulsFormatsNEXT, Impaler's Archive, elden-ring-eventparam, Elden Ring CT-TGA, Debug Tool, Practice Tool. Licenses verified via GitHub API + LICENSE files.)

I think the overview page should probably have a breakdown of like what percent of weapons you have collected, what percent of armor, whatever. People will probably want to use that as like a way to see overall game completion at a high level and Items Collected
463 / 5709
across 19 inventory types does nto tell you a whole lot.

[PARTIAL 2026-06-06] On the calcultor page we have a card for "Plan a Build" that looks like you might interact with it, idk kinda confusing. And the reset button stays clickable looking even when you have not interacted with it. (Reset is now disabled until the build differs from your save/Vagabond baseline; the confusing "Plan a build" banner still needs a rethink)

The calculator does not render weapon icons in the data table, we should add that.

[DONE 2026-06-06] We should probably make the side bar collapsable like the sidebar in the shadcn docs. (adopted the real shadcn Sidebar primitive — was 100% hand-rolled `<aside>` before, using none of the shadcn parts. Added `ui/sidebar.tsx` (Base UI `useRender` + inline Tailwind, copied verbatim from the resolved `base-nova` style at docs/cloned-repos-as-docs/ui/.../styles/base-nova — our configured `components.json` style — instead of running the CLI, which would clobber the customized tooltip.tsx), plus `ui/sheet.tsx` + `hooks/use-mobile.ts` deps and `--sidebar-*` theme tokens harmonized to our warm-stone palette. Rebuilt `AppSidebar` + `SlotSwitcher` on the primitives (`collapsible="icon"` rail; SlotSwitcher = the team-switcher pattern). Wrapped `_app.tsx` in `SidebarProvider`/`SidebarInset`; top bar now has a `SidebarTrigger` (collapses rail on desktop, opens off-canvas Sheet on mobile) and the duplicated mobile tab-nav row was removed in favor of that Sheet. Verified: client+SSR build + SSR render both clean.)

[DONE 2026-06-06] On the bosses page when you hover a boss and the tooltip appears, the tool tip content background is white even on the dark theme. This does not look good. (global Tooltip switched from the inverted bg-foreground style to bg-popover with a border — fixes every tooltip)

[DONE 2026-06-06] In the footer we have a button for github stars, that button should have the number of stars as the text. (live stargazers_count fetched from the GitHub API; omitted gracefully if the request fails)

# Stuff we should probably make seperate projects for

I would like to have like a sharing feature so that one user could share their stuff with a different user. The best way to do this is if we could encode the entire save file in the query params. We need to know how big the extracted part of the save file is and how ling wuery params could be. We could potentially compress it first to make this work.

It would be pretty cool if we could make our extractor extract like the 3d models of weapons and armor and we could like use threejs to render the characters current equipped gear.

I think the whole calculator page needs to be reworked, the user should be pick an option for like "I want to play a strength build, dex build, arcane build.. etc" and we should be able to tell them what is the best item in the inventory that matches their play style, which one does the most damage based on their stats, where they should place exp point the next time they level up, what weapons would be good to move to once hitting a certain level, etc... I think we need to explore the wiki a lot more and read about different build and possible like weapon tier lists to really make this good. Maybe we want calculators for different things. I could also see like a calculator that recommends when to respec your character if you are very badly specced, or want to change your build.  


I think it would be cool if there was a section on the map route or maybe even a new route that like showed the player what weapons and items are near their save location at any given time. Like if the player has the http server serving their save they could keep this website open in a browser tab and everytime they save they could glance over and make sure they are not missing any items. before moving onto the next area.

In the version of the website currently on prod all table filters, sorts, and even map pans and zooms were stored in a persisted zustland store. This meant if the user refreshed the page was the same. I know we replaced zustland for effect-atom but I think effect-atom can still do persisted state in localstorage just like zustland. we should definetly set that up.

We should make the website mobile friendly, definetly a new project doc should be made in docs/projects/future/mobile-friendly.md for this for manual verification.

I think maybe the overview screen should have data tables just for like collected inventory of all different item types. This might need to be a whole seperate project doc that we plan out how to show this in the ui but like sometimes a user might want to look at a data table of everything in game collected and not collected (with a filter for owned and not owned). and sometimes they might want to look at a data table of just the items they have collected.


On the map ui, somethings like the runes dropped have a tooltip on hover, but it also has a diffferent popup on click. Some map pins have a popup without a hover tooltip. I think we should standardize this. Also even on a dark theme the popup background is white, which does not look good.