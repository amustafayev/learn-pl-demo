import React, { useState } from "react";
import { IconSettings, IconBook2, IconUsers, IconStar, IconTrendingUp, IconMail } from "@tabler/icons-react";
import {
  Button, TextField, SearchField, TextArea, TagField, Avatar, Badge, Tag, Alert, ChatBubble,
  Card, StatCard, CourseCard, SessionRow, Switch, Checkbox, SegmentedToggle, NavItem, NavSectionLabel, TabBar, PillTabs,
} from "./design-system.jsx";

export default function DesignSystemPreview() {
  const [sw, setSw] = useState(true);
  const [cb, setCb] = useState(true);
  const [seg, setSeg] = useState("light");
  const [tab, setTab] = useState("detail");
  const [pill, setPill] = useState("unread");
  return (
    <div className="min-h-screen bg-white p-10 space-y-10 font-sans max-w-5xl mx-auto">
      <section>
        <h2 className="text-xs font-mono uppercase text-neutral-500 mb-3">Buttons</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="disabled">Recent</Button>
          <Button variant="primary">Recent</Button>
          <Button variant="dark">Recent</Button>
          <Button variant="light">Recent</Button>
          <Button variant="outline">Recent</Button>
          <Button variant="primary" chevron>Recent</Button>
          <Button variant="primary" iconOnly icon={IconSettings} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-mono uppercase text-neutral-500 mb-3">Inputs</h2>
        <div className="grid grid-cols-2 gap-4 max-w-xl">
          <SearchField placeholder="Search here" shortcut="⌘F" />
          <TextField placeholder="Write here" />
          <TextField defaultValue="Anastasia" />
          <TextField state="error" defaultValue="Anastasia" />
          <TextArea placeholder="Write here" />
          <TagField tags={[{ label: "PHP", color: "primary" }, { label: "API", color: "info" }, { label: "Laravel", color: "warning" }]} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-mono uppercase text-neutral-500 mb-3">Avatars</h2>
        <div className="flex gap-3 items-center">
          <Avatar name="Zaid Alrumi" color="primary" size="lg" status="online" />
          <Avatar name="Dani" color="pending" size="md" />
          <Avatar name="Kristin" color="info" size="sm" shape="square" />
          <Avatar name="X" color="dark" size="xs" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-mono uppercase text-neutral-500 mb-3">Badges / Tags / Alert / Chat</h2>
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <Badge color="primary">New</Badge>
          <Tag color="primary" onRemove={() => {}}>Database</Tag>
          <Tag color="success">Database</Tag>
          <Tag color="pending">Database</Tag>
          <Tag color="info">Database</Tag>
        </div>
        <Alert icon={IconMail} actionLabel="Upgrade Now" onClose={() => {}} className="mb-3">
          Upgrade your plan today access premium features!
        </Alert>
        <ChatBubble onReply={() => {}}>Hi Zaid, please help the friends who are still confused later.</ChatBubble>
      </section>

      <section>
        <h2 className="text-xs font-mono uppercase text-neutral-500 mb-3">Cards</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={IconTrendingUp} label="Total Course" value="120" delta="+20% Last month" />
          <CourseCard icon={IconBook2} badgeNew title="PHP Laravel Professional as Beginner" mentorName="Dani Carvajal" mentorColor="pending" category="Web Development" students={13} rating={4.7} progressPct={40} />
          <Card className="p-4">
            <SessionRow title="Safari (Macbook)" subtitle="Active (Jakarta, IND)" active />
            <SessionRow title="Mozilla (Windows)" subtitle="Last active on Nov 24, 2024" />
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-mono uppercase text-neutral-500 mb-3">Toggle / Checkbox</h2>
        <div className="flex items-center gap-6">
          <Switch checked={sw} onChange={setSw} />
          <Checkbox checked={cb} onChange={setCb} />
          <SegmentedToggle value={seg} onChange={setSeg} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-mono uppercase text-neutral-500 mb-3">Nav / Tabs</h2>
        <div className="grid grid-cols-[220px_1fr] gap-6">
          <Card className="p-3">
            <NavSectionLabel>Main Menu</NavSectionLabel>
            <NavItem icon={IconUsers} label="Student" active />
            <NavItem icon={IconStar} label="Payment" />
          </Card>
          <div className="space-y-4">
            <TabBar tabs={[{ id: "detail", label: "Detail" }, { id: "assignment", label: "Assignment" }, { id: "discussion", label: "Discussion" }]} value={tab} onChange={setTab} />
            <PillTabs tabs={[{ id: "all", label: "All" }, { id: "unread", label: "Unread", count: 13 }, { id: "mentioned", label: "Mentioned", count: 4 }]} value={pill} onChange={setPill} />
          </div>
        </div>
      </section>
    </div>
  );
}
