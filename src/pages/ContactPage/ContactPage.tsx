import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Reveal from '@/components/Reveal';
import SectionHeading from '@/components/SectionHeading';
import SocialIcon from '@/components/SocialIcon';
import { CONTACT_INFO, SOCIAL_LINKS, SITE_INFO } from '@/data/site';

const contactSchema = z.object({
  name: z.string().min(2, '请填写姓名（至少 2 个字符）'),
  email: z.string().email('请输入有效的邮箱地址'),
  message: z.string().min(10, '请至少输入 10 个字符'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '' },
  });

  const onSubmit = async (values: ContactFormValues) => {
    // 当前为前端演示：表单提交停留在本地，未接入真实后端
    await new Promise((resolve) => setTimeout(resolve, 900));
    toast.success('消息已准备好', {
      description: `感谢 ${values.name} 的留言！请通过邮箱 ${SITE_INFO.email} 与我联系。`,
    });
    form.reset();
  };

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pb-8 pt-20 md:px-8 md:pt-28">
          <Reveal>
            <p className="mb-3 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.28em] text-primary">
              <span className="h-px w-8 bg-primary/60" />
              Contact
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              联系我
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              无论是合作机会、技术交流还是随便聊聊，都欢迎给我留言。
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          {/* 联系方式 */}
          <div className="space-y-5">
            <SectionHeading
              eyebrow="Direct"
              title="其他方式"
              description="也可以直接通过这些渠道找到我。"
            />
            {CONTACT_INFO.map((item, index) => (
              <Reveal key={item.label} delay={index * 0.05}>
                {item.href ? (
                  <a
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    className="glow-border-hover group flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-colors hover:border-primary/40"
                  >
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-primary">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-sm text-foreground">{item.value}</p>
                    </div>
                    <span className="font-mono text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      {'->'}
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-primary">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-sm text-foreground">{item.value}</p>
                    </div>
                  </div>
                )}
              </Reveal>
            ))}

            <Reveal delay={0.2}>
              <div className="rounded-xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
                <p className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">
                  Social
                </p>
                <div className="flex flex-wrap gap-3">
                  {SOCIAL_LINKS.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={social.label}
                      className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/50 px-3 py-2 font-mono text-xs text-muted-foreground transition-all hover:border-primary/50 hover:text-primary hover:shadow-[0_0_14px_hsl(217_91%_60%_/_0.3)]"
                    >
                      <SocialIcon name={social.icon} className="h-4 w-4" />
                      {social.handle}
                    </a>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* 联系表单 */}
          <Reveal delay={0.1}>
            <div className="glow-border rounded-2xl bg-card/70 p-7 backdrop-blur-sm md:p-9">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                给我留言
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                表单目前为前端演示，提交后不会真正发送；接入后端后即可正常收发。
              </p>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  noValidate
                  className="mt-7 space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>姓名</FormLabel>
                        <FormControl>
                          <Input placeholder="你的名字" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>邮箱</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>留言内容</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={5}
                            placeholder="想说的话…"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={form.formState.isSubmitting}
                    className="w-full gap-2 md:w-auto"
                  >
                    <Send className="h-4 w-4" />
                    {form.formState.isSubmitting ? '发送中…' : '发送留言'}
                  </Button>
                </form>
              </Form>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
