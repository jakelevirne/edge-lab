# Build a Laser Cut Rack

Rather than have a bunch of Raspberry Pis laying out on my desk, I thought it would make sense to build a rack to contain them all nicely together. This [rack from C4 Labs](https://www.amazon.com/Cloudlet-CASE-Raspberry-Computers-Compatible/dp/B0844YSJWB) is well rated and the slotted removable panel design looks useful. But since I'm lucky enough to have access to a Glowforge, I thought I'd make my own rack.

## Edge Lab Rack v1

![image RackV1](../rack/EdgeLabRackV1.png)

It's a little messy, but it gets the job done and makes it easier to transport all the Pis and peripherals in one go.

### Parts

- Four (4) 1/4" X 12" threaded rods (I would have chosen metric for consistency, but couldn't find any at my local hardware store)

- Sixteen (16) 1/4"-20 steel nuts (to match up with the threaded rods)

- 3mm acrylic laser cut panels for sides and shelf (see [pattern](edge-lab-rack.svg))

- 3mm acrylic laser cut hanging panels for mounting the Pis (see [pattern](edge-lab-rack.svg))

- Four (4) 3mm X 12mm machine screws and nuts to hold the shelf in place with [T-bolt construction](https://www.instructables.com/How-to-Make-Anything-Using-Acrylic-and-Machine-Sc/)

### Physical

- Rack dimensions are approximately 300mm X 165mm x 180mm (width X depth X height)

- Assembly is completely mechanical (no glueing), relying on the 4 rods and [T-bolt construction](https://www.instructables.com/How-to-Make-Anything-Using-Acrylic-and-Machine-Sc/) to keep the shelf in place, adding rigidity

- This design has proven fairly sturdy, even able to stand up to torsion without loosening.

### Assembly

Each rod is bolted onto the acrylic sides with two 1/4" bolts on either side of the acrylic. The shelf (white in the above picture) is dry fitted in between the sides before fully bolting. The machine screws and nuts are used in the T-bolt slots to hold the shelf in place.

### Cooling

Each Raspberry Pi has it's own active cooler (in this case the [Official Raspberry Pi 5 Active Cooler](https://www.adafruit.com/product/5815)). With the open design of the rack, there's no need for additional cooling. If I were to make a more enclosed rack, I would likely add case fans similar to the C4 Labs design.

### Power and Cable Management

Right now the rack has no power or cable management, though I might add some cable routing holes in a future version.
