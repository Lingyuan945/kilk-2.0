import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';
import SkillBar from '@/components/SkillBar';
import { SKILLS } from '@/data/site';

export default function SkillsSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:px-8">
      <SectionHeading
        eyebrow="Skills"
        title="技能详情"
        description="多年实战积累的技术栈与核心能力，等级为自我评估。"
      />
      <div className="grid gap-x-14 gap-y-8 md:grid-cols-2">
        {SKILLS.map((skill, index) => (
          <Reveal key={skill.name} delay={(index % 2) * 0.06}>
            <SkillBar skill={skill} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
